import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between">
          <Link className="flex items-center gap-2 font-bold text-slate-950" href="/">
            <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                <path d="M8 8V5m8 3V5M5 10h14v9H5z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                <path d="M9 14h.01M15 14h.01M9 17h6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
              </svg>
            </span>
            AI Career Assistant
          </Link>
          <Link className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white" href="/login">
            Đăng nhập
          </Link>
        </header>
        <section className="grid items-center gap-12 py-16 sm:py-24 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="rounded-full bg-violet-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-violet-700">
              Hành trình nghề nghiệp bắt đầu từ đây
            </span>
            <h1 className="mt-6 max-w-2xl text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
              Tự tin phát triển sự nghiệp cùng AI
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
              Phân tích CV, khám phá kỹ năng cần bổ sung và luyện phỏng vấn trên một nền tảng duy nhất.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-700" href="/register">
                Tạo tài khoản miễn phí
              </Link>
              <Link className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-violet-200 hover:text-violet-700" href="/login">
                Đăng nhập
              </Link>
            </div>
          </div>
          <div className="rounded-3xl bg-gradient-to-br from-[#17183f] to-violet-800 p-7 text-white shadow-xl shadow-violet-950/15 sm:p-9">
            <p className="text-sm font-semibold text-violet-200">MỌI THỨ BẠN CẦN</p>
            <h2 className="mt-3 text-2xl font-bold">Một bước tiến mỗi ngày</h2>
            <div className="mt-7 space-y-4">
              {[
                ["01", "Phân tích CV", "Nhận diện kỹ năng và điểm cần cải thiện"],
                ["02", "Lộ trình cá nhân", "Tiến gần hơn tới vai trò bạn mong muốn"],
                ["03", "Luyện phỏng vấn", "Chuẩn bị sẵn sàng cho cơ hội mới"],
              ].map(([number, title, description]) => (
                <div className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4" key={number}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm font-bold text-violet-200">{number}</span>
                  <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="mt-1 text-sm text-indigo-100/70">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
