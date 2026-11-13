import styles from "./loading.module.css"

export default function Loading() {
  return <main className={styles.page} role="status" aria-busy="true">
    <span className="sr-only">Loading administrator sign-in…</span>
    <div className={styles.form} aria-hidden="true">
      <div className={styles.icon} />
      <div className={styles.title} />
      <div className={styles.subtitle} />
      {[0, 1].map(index => <div className={styles.field} key={index}><div className={styles.label} /><div className={styles.input} /></div>)}
      <div className={styles.button} />
    </div>
  </main>
}
