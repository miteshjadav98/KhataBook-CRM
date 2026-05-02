import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.container}>
      <main className={`${styles.hero} animate-fade-in`}>
        <h1 className={styles.title}>
          KhataBook <br />
          <span className="text-gradient">CRM Platform</span>
        </h1>
        
        <p className={styles.subtitle}>
          The modern solution to manage your customers, track transactions, and grow your business with a beautiful and dynamic interface.
        </p>

        <div className={styles.ctas}>
          <Link href="/dashboard" className="btn-primary">
            Go to Dashboard
          </Link>
          <Link href="/customers" className="btn-secondary">
            View Customers
          </Link>
        </div>
      </main>
    </div>
  );
}
