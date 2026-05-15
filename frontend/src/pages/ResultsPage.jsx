const FIXTURE = {
    score: 82,
    trend: "Improving",
    issues: [
        {
            id: "knee-valgus",
            title: "Knee valgus",
            severity: "Medium",
            detail: "Knee caves inward at the bottom of the squat on the right leg.",
        },
    ],
}

function ProgressChip({ text }) {
    return (
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-cyan-glow/20 text-sm font-medium text-cyan-glow">
            {text}
        </span>
    )
}

function IssueCard({ issue }) {
    return (
        <div className="border rounded-lg p-3 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">{issue.title}</h3>
                <span className="text-xs text-text-teritary">{issue.severity}</span>
            </div>
            <p className="text-xs text-text-secondary">{issue.detail}</p>
        </div>
    )
}

const ResultsPage = () => {
    return (
        <div className="min-h-screen bg-light-bg p-6">
            <div className="max-w-3xl mx-auto space-y-6">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary">Analysis Results</h1>
                        <p className="text-sm text-text-teritary">Session summary and recommendations</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-2xl font-bold shadow">
                                {FIXTURE.score}
                            </div>
                            <span className="text-xs text-text-teritary mt-1">Score</span>
                        </div>

                        <ProgressChip text={FIXTURE.trend} />
                    </div>
                </header>

                <section className="space-y-3">
                    <h2 className="text-sm font-semibold text-text-primary">Issues detected</h2>
                    <div className="space-y-2">
                        {FIXTURE.issues.map((iss) => (
                            <IssueCard key={iss.id} issue={iss} />
                        ))}
                    </div>
                </section>

                <section className="p-4 rounded-lg bg-light-card border">
                    <h3 className="text-sm font-semibold mb-2">Next steps</h3>
                    <ul className="list-disc list-inside text-sm text-text-secondary">
                        <li>Work on knee alignment drills for 2 weeks.</li>
                        <li>Reduce load and focus on tempo on descent.</li>
                    </ul>
                </section>
            </div>
        </div>
    )
}

export default ResultsPage
