import type { ReactNode } from "react";

type PageIntroProps = {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageIntro({
  eyebrow,
  title,
  description,
  actions
}: PageIntroProps) {
  return (
    <section className="page-intro panel">
      <div className="page-intro-content">
        <p className="eyebrow">{eyebrow}</p>
        <div className="intro-title-row">
          <h1>{title}</h1>
          {actions ? <div className="page-intro-actions">{actions}</div> : null}
        </div>
        {description ? <p className="section-copy page-intro-copy">{description}</p> : null}
      </div>
    </section>
  );
}
