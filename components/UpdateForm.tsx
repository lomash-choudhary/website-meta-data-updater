"use client";

import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

export function UpdateForm() {
  const { data: session, status } = useSession();
  const [repo, setRepo] = useState("");
  const [title, setTitle] = useState("");
  const [favicon, setFavicon] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !favicon) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("repo", repo);
      formData.append("title", title);
      formData.append("favicon", favicon);

      const response = await fetch("/api/update-site", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to update repository");
      }

      alert("Successfully updated repository!");
      setRepo("");
      setTitle("");
      setFavicon(null);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p>Please sign in to continue</p>
        <button
          onClick={() => signIn("github")}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Sign in with GitHub
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">
            GitHub Repository (username/repo):
          </label>
          <input
            type="text"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            required
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label className="block mb-1">Website Title:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label className="block mb-1">Favicon:</label>
          <input
            type="file"
            accept=".ico,.png,.jpg,.jpeg"
            onChange={(e) => setFavicon(e.target.files?.[0] || null)}
            required
            className="w-full"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white py-2 rounded disabled:bg-blue-300"
        >
          {loading ? "Updating..." : "Update Repository"}
        </button>
      </form>

      <button
        onClick={() => signOut()}
        className="mt-4 w-full bg-gray-200 py-2 rounded"
      >
        Sign out
      </button>
    </div>
  );
}
