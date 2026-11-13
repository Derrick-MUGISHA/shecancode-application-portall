import styles from "./authenticating-screen.module.css"

export default function AuthenticatingScreen({
  description = "Please wait while we verify your session.",
}: { description?: string }) {
  return <div className={styles.screen}>
    <section className={styles.status} role="status" aria-live="polite" aria-busy="true" aria-labelledby="authentication-title">
      <span className={styles.spinner} aria-hidden="true" />
      <h1 id="authentication-title">Authenticating…</h1>
      <p className="sr-only">{description}</p>
    </section>
  </div>
}
