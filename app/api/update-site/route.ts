import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { Octokit } from "@octokit/rest";
import { config as authOptions } from "../auth/config";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const repo = formData.get("repo") as string;
    const title = formData.get("title") as string;
    const favicon = formData.get("favicon") as Blob;

    if (!repo || !title || !favicon) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const [owner, repository] = repo.split("/");
    const octokit = new Octokit({
      auth: session.accessToken as string,
    });

    const faviconBuffer = Buffer.from(await favicon.arrayBuffer());
    const faviconBase64 = faviconBuffer.toString("base64");
    const layoutContent = await getLayoutContent(octokit, owner, repository);
    const updatedLayoutContent = updateLayoutTitle(layoutContent, title);

    // First, create and update favicon blob
    const { data: faviconBlob } = await octokit.git.createBlob({
      owner,
      repo: repository,
      content: faviconBase64,
      encoding: "base64",
    });

    // Then, create and update layout blob
    const { data: layoutBlob } = await octokit.git.createBlob({
      owner,
      repo: repository,
      content: Buffer.from(updatedLayoutContent).toString("base64"),
      encoding: "base64",
    });

    // Get the latest commit
    const { data: ref } = await octokit.git.getRef({
      owner,
      repo: repository,
      ref: "heads/main",
    });

    // Get the current tree
    const { data: currentTree } = await octokit.git.getTree({
      owner,
      repo: repository,
      tree_sha: ref.object.sha,
      recursive: "true",
    });

    // Create new tree entries while preserving other files
    const newTree = currentTree.tree.map((item) => {
      if (item.path === "src/app/favicon.ico") {
        return {
          path: "src/app/favicon.ico",
          mode: "100644" as const,
          type: "blob" as const,
          sha: faviconBlob.sha,
        };
      }
      if (item.path === "src/app/layout.tsx") {
        return {
          path: "src/app/layout.tsx",
          mode: "100644" as const,
          type: "blob" as const,
          sha: layoutBlob.sha,
        };
      }
      return {
        path: item.path,
        mode: item.mode as "100644" | "100755" | "040000" | "160000" | "120000",
        type: item.type as "blob" | "tree" | "commit",
        sha: item.sha,
      };
    });

    // Create a new tree
    const { data: treeData } = await octokit.git.createTree({
      owner,
      repo: repository,
      tree: newTree,
      base_tree: ref.object.sha,
    });

    // Create a commit
    const { data: commit } = await octokit.git.createCommit({
      owner,
      repo: repository,
      message: "Update website title and favicon",
      tree: treeData.sha,
      parents: [ref.object.sha],
    });

    // Update the reference
    await octokit.git.updateRef({
      owner,
      repo: repository,
      ref: "heads/main",
      sha: commit.sha,
    });

    return NextResponse.json({ message: "Successfully updated repository" });
  } catch (error) {
    console.error("Error in update-site:", error);
    return NextResponse.json(
      { error: "Failed to update repository" },
      { status: 500 }
    );
  }
}

async function getLayoutContent(octokit: Octokit, owner: string, repo: string) {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: "src/app/layout.tsx",
    });
    if ("content" in data) {
      return Buffer.from(data.content, "base64").toString();
    }
    return "";
  } catch (error) {
    return "";
  }
}

function updateLayoutTitle(content: string, newTitle: string) {
  return content.replace(/title:\s*["'].*?["']/, `title: "${newTitle}"`);
}

export async function getFaviconSha(
  octokit: Octokit,
  owner: string,
  repo: string
) {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: "src/app/favicon.ico",
    });
    return { sha: "sha" in data ? data.sha : undefined };
  } catch (error) {
    return {};
  }
}
