import { UpdateForm } from '@/components/UpdateForm'

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Website Metadata Manager</h1>
      <UpdateForm />
    </main>
  )
} 