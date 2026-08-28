/**
 * 技能页数据源（纯内容）。
 * 页面展示与筛选规则由 src/config/skillsConfig.ts 控制。
 */
import type { SkillItem } from "@/types/skillsConfig";

export const skillsData: SkillItem[] = [
	{
		name: "HTML",
		description: "正在学习语义化标签、页面结构与基础可访问性写法。",
		icon: "simple-icons:html5",
		category: "frontend",
		level: "intermediate",
	},
	{
		name: "CSS",
		description: "持续练习布局、响应式样式与常见视觉效果实现。",
		icon: "simple-icons:css3",
		category: "frontend",
		level: "beginner",
	},
	{
		name: "JavaScript",
		description: "入门学习浏览器交互、基础语法与简单页面逻辑。",
		icon: "simple-icons:javascript",
		category: "frontend",
		level: "beginner",
	},
	{
		name: "Python",
		description: "学习基础语法、脚本编写与日常自动化处理。",
		icon: "simple-icons:python",
		category: "backend",
		level: "beginner",
	},
	{
		name: "C++",
		description: "入门理解语法、面向对象基础与简单算法练习。",
		icon: "simple-icons:cplusplus",
		category: "backend",
		level: "beginner",
	},
	{
		name: "Linux 运维",
		description: "学习常用命令、服务部署、权限管理与基础故障排查。",
		icon: "simple-icons:linux",
		category: "tooling",
		level: "beginner",
	},
];

/** 获取所有技能数据列表 */
export function getSkillsList(): SkillItem[] {
	return skillsData;
}
