import type { AnnouncementConfig } from "@/types/announcementConfig";

/**
 * 公告栏配置
 * 组件显示由 sidebarConfig 统一控制
 */
export const announcementConfig: AnnouncementConfig = {
	title: "", // 公告标题，填空使用 i18n 字符串 Key.announcement
	content: "欢迎访问我的博客！", // 公告内容
	closable: true, // 允许用户关闭公告
	link: {
		enable: true, // 启用链接
		text: "Learn More", // 链接文本
		url: "/about/", // 链接 URL
		external: false, // 内部链接
  },
};
