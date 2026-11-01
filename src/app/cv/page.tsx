import { Download, ExternalLink, FileText } from "lucide-react";

const cvs = [
  {
    name: "Kaleem Durrani",
    file: "kaleem-durrani-cv.pdf",
    liveFile: "kaleem-durrani.html",
  },
  {
    name: "Shamsa Durrani",
    file: "shamsa-durrani-cv.pdf",
    liveFile: "shamsa-durrani.html",
  },
];

export default function CvPage() {
  return (
    <main className="min-h-screen bg-[#F4F5F7] text-[#101216]">
      <section className="bg-[#101216] py-16 text-white sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#E31E36]">
            Curriculum Vitae
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
            CVs
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-300 sm:text-base">
            View or download the CVs below.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2">
          {cvs.map((cv) => (
            <article
              key={cv.file}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E31E36]/10 text-[#E31E36]">
                <FileText className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="mt-5 text-lg font-bold">{cv.name}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Curriculum Vitae
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href={`/cvs/${cv.liveFile}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#101216] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#242830]"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  Open Live CV
                </a>
                <a
                  href={`/cvs/${cv.file}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-xs font-bold text-[#101216] transition hover:bg-gray-100"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  View CV
                </a>
                <a
                  href={`/cvs/${cv.file}`}
                  download
                  className="inline-flex items-center gap-2 rounded-lg bg-[#E31E36] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#C8162D]"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Download PDF
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
