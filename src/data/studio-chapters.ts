export const studioChapters = [
  { id: "top", label: "The room" },
  { id: "work", label: "Selected work" },
  { id: "experience", label: "Experience" },
  { id: "about", label: "Practice" },
  { id: "github", label: "GitHub" },
  { id: "contact", label: "Contact" },
] as const;

type StudioChapterId = (typeof studioChapters)[number]["id"];

export function studioChapter(id: StudioChapterId) {
  const index = studioChapters.findIndex((chapter) => chapter.id === id);
  return {
    ...studioChapters[index],
    number: String(index + 1).padStart(2, "0"),
  };
}
