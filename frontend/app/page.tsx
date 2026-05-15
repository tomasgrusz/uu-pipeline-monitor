export default function Home() {
  return (
    <section className="dashboard-hero">
      <div>
        <p className="eyebrow">Dashboard</p>
        <h1>Pipeline operations at a glance</h1>
        <p className="hero-copy">
          This dashboard will eventually summarize key metrics, alerts, and
          system health.
        </p>
      </div>

      <div className="dashboard-grid">
        <article className="dashboard-card">
          <p className="card-label">Status</p>
          <p className="card-value">TBA</p>
        </article>
        <article className="dashboard-card">
          <p className="card-label">Alerts</p>
          <p className="card-value">TBA</p>
        </article>
        <article className="dashboard-card">
          <p className="card-label">Runs</p>
          <p className="card-value">TBA</p>
        </article>
      </div>
    </section>
  );
}
