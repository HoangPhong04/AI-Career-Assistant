export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-4xl font-bold">AI Career Assistant</h1>
        <p className="mt-4 text-lg">
          Hệ thống hỗ trợ định hướng nghề nghiệp và phỏng vấn bằng AI.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border p-5">
            <h2 className="font-semibold">CV Analyzer</h2>
            <p className="mt-2 text-sm">Phân tích CV và đánh giá kỹ năng.</p>
          </div>
          <div className="rounded-xl border p-5">
            <h2 className="font-semibold">Career Roadmap</h2>
            <p className="mt-2 text-sm">Đề xuất lộ trình nghề nghiệp.</p>
          </div>
          <div className="rounded-xl border p-5">
            <h2 className="font-semibold">Interview Simulator</h2>
            <p className="mt-2 text-sm">Mô phỏng phỏng vấn và nhận feedback.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
