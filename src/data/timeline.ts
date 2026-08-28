/**
 * 时间线页数据源（纯内容）。
 * 页面展示与筛选规则由 src/config/timelineConfig.ts 控制。
 */
import type { TimelineItem } from "@/types/timelineConfig";

export const timelineData: TimelineItem[] = [
	{
		title: "将博客系统从 Mizuki 迁移到 Shirone",
		date: "2026.08",
		category: "里程碑",
		subtitle: "博客",
		description:
			"我将我的博客系统从 Mizuki 迁移到 Shirone，利用 Shirone 的强大功能和灵活性来提升博客的性能和可扩展性。",
		tags: ["Astro", "Svelte 5", "M3E", "Tailwind 4"],
		links: [
			{
				label: "主题项目地址",
				url: "https://github.com/LyraVoid/Shirone",
				icon: "fa6-brands:github",
			},
		],
		icon: "material-symbols:rocket-launch-rounded",
		featured: true,
	},
	{
		title: "开始写作之旅",
		date: "2022.08",
		category: "生活",
		subtitle: "开始向世界分享我的想法",
		description:
			"我在网上发布了我的第一篇文，并开始记录前端探索、创意编码和个人感悟。",
		tags: ["博客", "写作", "开源"],
		icon: "material-symbols:edit-note-rounded",
	},
];

/** 获取所有时间线数据列表 */
export function getTimelineList(): TimelineItem[] {
	return timelineData;
}
