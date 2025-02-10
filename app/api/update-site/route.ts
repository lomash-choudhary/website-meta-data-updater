import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { Octokit } from "@octokit/rest";
import { authOptions } from "../auth/[...nextauth]/route";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    console.log("No session or access token found:", session); // Debug log
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

    // Verify authentication
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

    try {
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo: repository,
        path: "src/app/favicon.ico",
        message: "Update favicon",
        content: faviconBase64,
        ...(await getFaviconSha(octokit, owner, repository)),
        branch: "main",
      });

      return NextResponse.json({ message: "Successfully updated repository" });
    } catch (error) {
      console.error("Error updating repository:", error);
      return NextResponse.json(
        { error: "Failed to update repository" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in update-site:", error);
    return NextResponse.json(
      { error: "Failed to update repository" },
      { status: 500 }
    );
  }
}

async function getFaviconSha(octokit: Octokit, owner: string, repo: string) {
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
