/* eslint-disable @next/next/no-img-element */

/** Sets `intro-seen` on <html> before paint so the curtain only plays once per session. */
export const introScript = `try{if(sessionStorage.getItem("iss-intro")){document.documentElement.classList.add("intro-seen")}else{sessionStorage.setItem("iss-intro","1")}}catch(e){document.documentElement.classList.add("intro-seen")}`;

export function Intro() {
  return (
    <div className="intro" aria-hidden>
      <div className="flex flex-col items-center">
        <img src="/brand/logo-badge.webp" alt="" width={96} height={96} className="intro__badge" />
        <div className="intro__bar" />
      </div>
    </div>
  );
}
