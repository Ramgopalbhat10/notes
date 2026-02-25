import { Onest, Roboto_Serif } from "next/font/google";

const onest = Onest({
  subsets: ["latin"],
  variable: "--font-onest",
});

const robotoSerif = Roboto_Serif({
  subsets: ["latin"],
  variable: "--font-roboto-serif",
});

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${onest.variable} ${robotoSerif.variable}`}>
      {children}
    </div>
  );
}
