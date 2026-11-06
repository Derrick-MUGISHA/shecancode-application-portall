import styles from "@/app/home.module.css";

export default function ArcticBackdrop({ grain = true }: { grain?: boolean }) {
  return (
    <>
        <div className={styles.layerOne} aria-hidden="true" />
        <div className={styles.layerTwo} aria-hidden="true" />
        {grain && <svg className={styles.grain} aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="arctic-frost-grain">
              <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="4" stitchTiles="stitch" />
              <feColorMatrix type="matrix" values="0.181 0.608 0.061 0 0.075 0.181 0.608 0.061 0 0.075 0.181 0.608 0.061 0 0.075 0 0 0 1 0" />
            </filter>
          </defs>
          <rect width="100%" height="100%" filter="url(#arctic-frost-grain)" />
        </svg>}
    </>
  );
}
