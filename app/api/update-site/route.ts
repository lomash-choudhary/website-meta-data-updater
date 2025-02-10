import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { Octokit } from "@octokit/rest";
import { config as authOptions } from "../auth/config";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    console.log("No session or access token found:", session);
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

    try {
      await octokit.rest.users.getAuthenticated();
    } catch (error) {
      console.error("GitHub authentication failed:", error);
      return NextResponse.json(
        { error: "GitHub authentication failed" },
        { status: 401 }
      );
    }

    const faviconBuffer = Buffer.from(await favicon.arrayBuffer());
    const faviconBase64 = faviconBuffer.toString("base64");
    const layoutContent = await getLayoutContent(octokit, owner, repository);
    const updatedLayoutContent = updateLayoutTitle(layoutContent, title);

    // Create a tree with both files
    const tree = [
      {
        path: "src/app/favicon.ico",
        mode: "100644" as const,
        type: "blob" as const,
        content: faviconBase64,
      },
      {
        path: "src/app/layout.tsx",
        mode: "100644" as const,
        type: "blob" as const,
        content: updatedLayoutContent,
      },
    ];

    // Get the latest commit SHA
    const { data: ref } = await octokit.git.getRef({
      owner,
      repo: repository,
      ref: "heads/main",
    });
    const latestCommit = ref.object.sha;

    // Create a new tree
    const { data: treeData } = await octokit.git.createTree({
      owner,
      repo: repository,
      base_tree: latestCommit,
      tree,
    });

    // Create a commit
    const { data: commit } = await octokit.git.createCommit({
      owner,
      repo: repository,
      message: "Update website title and favicon",
      tree: treeData.sha,
      parents: [latestCommit],
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
