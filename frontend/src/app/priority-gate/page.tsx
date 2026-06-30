export default function PriorityGatePage() {
  return (
    <main className="flex flex-col min-h-screen w-full items-center justify-center bg-[var(--color-bg-page)] p-10">
      <h1 className="text-4xl font-bold">루틴 점검</h1>
      <div className="flex h-[70vh] w-full max-w-[1200px] translate-y-8 overflow-hidden  bg-[var(--color-bg-component)] shadow-lg gap-6">
        <div className="flex h-full w-full flex-col items-center justify-center flex-1 rounded-lg bg-blue-200">
          루틴 점검
        </div>
        <div className="flex h-full w-full flex-col items-center justify-center flex-1 rounded-lg bg-amber-200">
          사용 제품
        </div>
        <div className="flex h-full w-full flex-col items-center justify-center flex-1 rounded-lg bg-amber-700">
          결과
        </div>
      </div>
    </main>
  );
}
