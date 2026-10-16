import { CVUploadForm } from "@/components/cv/cv-upload-form";

export default function CVPage() {
	return (
		<main className="mx-auto w-full max-w-4xl px-6 py-10">
			<h1 className="text-2xl font-semibold text-neutral-950">CV Analyzer</h1>
			<CVUploadForm />
		</main>
	);
}
