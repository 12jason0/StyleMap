export default function Loading() {
    return (
        <main className="min-h-screen bg-gray-50 text-black">
            {/* Hero 섹션 스켈레톤 (고정 포지션 사용 안 함) */}
            <section className="relative h-[300px] md:h-[500px] overflow-hidden pt-10">
                <div className="absolute inset-0">
                    <div className="w-full h-full bg-gray-200 animate-pulse" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-transparent" />
                </div>
                <div className="relative h-full max-w-[500px] mx-auto px-4 flex items-center">
                    <div className="max-w-[85%] md:max-w-2xl">
                        <div className="flex gap-3 mb-4">
                            <div className="h-7 w-20 rounded-full bg-white/40 animate-pulse" />
                            <div className="h-7 w-16 rounded-full bg-white/40 animate-pulse" />
                        </div>
                        <div className="h-6 w-64 rounded bg-white/60 animate-pulse mb-3" />
                        <div className="h-4 w-80 rounded bg-white/40 animate-pulse" />
                    </div>
                </div>
            </section>

            <section className="py-10">
                <div className="max-w-[500px] mx-auto px-4">
                    <div className="grid grid-cols-1 gap-8">
                        <div className="space-y-8">
                            {/* 지도 스켈레톤 */}
                            <div className="bg-white rounded-2xl shadow-lg p-4 md:p-8">
                                <div className="mb-8 rounded-2xl overflow-hidden shadow-lg">
                                    <div className="w-full h-64 md:h-80 bg-gray-200 animate-pulse" />
                                </div>
                                {/* 타임라인 스켈레톤 */}
                                <div className="relative pl-6 md:pl-10">
                                    <div className="absolute left-4 md:left-5 top-0 bottom-0 w-0.5 bg-gray-200" />
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <div key={i} className="relative mb-6 md:mb-8">
                                            <div className="absolute -left-7 md:-left-8 top-6 w-4 h-4 bg-gray-300 rounded-full border-4 border-white" />
                                            <div className="rounded-xl p-4 md:p-6 border border-gray-200 bg-white">
                                                <div className="flex gap-4">
                                                    <div className="w-36 flex-shrink-0">
                                                        <div className="h-24 bg-gray-200 rounded-lg animate-pulse" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse mb-2" />
                                                        <div className="h-3 w-2/3 bg-gray-200 rounded animate-pulse mb-2" />
                                                        <div className="flex gap-2 mt-2">
                                                            <div className="h-5 w-16 rounded-full bg-gray-200 animate-pulse" />
                                                            <div className="h-5 w-20 rounded-full bg-gray-200 animate-pulse" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}





