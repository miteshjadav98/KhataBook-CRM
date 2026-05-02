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
          The modern solution to manage your customers, track उधार (Udhar) &amp; जमा (Jama), and grow your business with a beautiful interface.
        </p>

        <div className={styles.ctas}>
          <Link href="/dashboard" className="btn-primary">
            Go to Dashboard
          </Link>
          <Link href="/auth/customer-login" className="btn-secondary">
            Customer Login
          </Link>
        </div>

        <div className={styles.featuresGrid}>
          <div className={`${styles.featureCard} glass-panel delay-100 animate-fade-in`}>
            <div className={styles.featureIcon}>👥</div>
            <h3 className={styles.featureTitle}>Customer Management</h3>
            <p className={styles.featureText}>
              Add customers, track their khata, and manage balances with ease.
            </p>
          </div>

          <div className={`${styles.featureCard} glass-panel delay-200 animate-fade-in`}>
            <div className={styles.featureIcon}>📒</div>
            <h3 className={styles.featureTitle}>Udhar / Jama Ledger</h3>
            <p className={styles.featureText}>
              Record credit (उधार) and payments (जमा) with running balance and interest tracking.
            </p>
          </div>

          <div className={`${styles.featureCard} glass-panel delay-300 animate-fade-in`}>
            <div className={styles.featureIcon}>📊</div>
            <h3 className={styles.featureTitle}>Dashboard &amp; Analytics</h3>
            <p className={styles.featureText}>
              See total due, collected, overdue, and monthly revenue at a glance.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
