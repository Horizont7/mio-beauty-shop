export default function CategoryLoading() {
  return (
    <main className="min-h-screen bg-[#FAF8F6] px-6 py-12">
      <section className="mx-auto max-w-7xl">
        <div className="mb-10">
          <div className="h-4 w-24 rounded-full bg-[#EEA391]/30" />
          <div className="mt-3 h-10 w-64 rounded-xl bg-white" />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="overflow-hidden rounded-[30px] bg-white shadow-sm"
            >
              <div className="h-[260px] bg-[#F7F5FA]" />
              <div className="space-y-3 p-5">
                <div className="h-4 w-3/4 rounded-full bg-gray-100" />
                <div className="h-5 w-1/2 rounded-full bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
