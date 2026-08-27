import type { ProfileConfig } from "@/types/config";

/**
 * 博主资料：头像 / 名称 / 简介 / 社交链接（侧栏 Profile 卡片、页脚、RSS 作者等消费）。
 * 类型见 src/types/config.ts。
 */
export const profileConfig: ProfileConfig = {
	avatar: "assets/images/avatar.png", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
	name: "freebird2913",
	bio: "雨记得天空忘记说的话。",
	links: [
		{
		name: "GitHub",
		icon: "fa7-brands:github",
		url: "https://github.com/acleverfreebird",
		},
	],
};
