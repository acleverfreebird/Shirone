/**
 * 项目页数据源（纯内容）。
 * 页面展示与筛选规则由 src/config/projectsConfig.ts 控制。
 */
import type { ProjectItem } from "@/types/projectsConfig";

export const projectsData: ProjectItem[] = [
	{
		key: "blog",
		title: "我的个人博客",
		summary:
			"一个基于 Astro 的个人博客主题，支持 Markdown、MDX、RSS、Sitemap、评论等功能",
		category: "theme",
		phase: "building",
		technologies: ["Astro", "Svelte", "TypeScript", "Tailwind CSS"],
		icon: "material-symbols:deployed-code-outline-rounded",
		cover: "/assets/projects/shirone.webp",
		coverAlt: "Shirone theme homepage preview",
		featured: true,
		repository: "https://github.com/acleverfreebird/Shirone",
		year: "2026",
	},
];

/** 获取所有项目数据列表 */
export function getProjectsList(): ProjectItem[] {
	return projectsData;
}
