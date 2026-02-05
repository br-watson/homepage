export interface Profile {
	name: string;
	nameAsciiArt?: string[];
	role: string;
	location: string;
	email: string;
	links: Record<string, string>;
	filePaths: {
		cv: string;
		dissertation: string;
	};
	bio: string[];
	projects: {
		name: string;
		desc: string;
		link: string;
		tags: string[];
	}[];
	skills: string[];
	roles: {
		title: string;
		company: string;
		location: string;
		startDate: string;
		endDate?: string;
		description?: string;
	}[];
}

export const PROFILE: Profile = {
	name: "Bradley Watson",
	nameAsciiArt: [
		"____________  ___ ______   _    _  ___ _____ _____  _____ _   _",
		"| ___ \\ ___ \\/ _ \\|  _  \\ | |  | |/ _ \\_   _/  ___||  _  | \\ | |",
		"| |_/ / |_/ / /_\\ \\ | | | | |  | / /_\\ \\| | \\ `--. | | | |  \\| |",
		"| ___ \\    /|  _  | | | | | |/\\| |  _  || |  `--. \\| | | | . ` |",
		"| |_/ / |\\ \\| | | | |/ /  \\  /\\  / | | || | /\\__/ /\\ \\_/ / |\\  |",
		"\\____/\\_| \\_\\_| |_/___/    \\/  \\/\\_| |_/\\_/ \\____/  \\___/\\_| \\_/",
	],
	role: "Software Engineer",
	location: "Yorkshire, UK",
	email: "you@example.com",
	links: {
		github: "https://github.com/your-handle",
		linkedin: "https://www.linkedin.com/in/your-handle",
	},
	filePaths: {
		cv: "./assets/cv.pdf",
		dissertation: "./assets/diss.pdf",
	},
	bio: [
		"I build backend systems, pipelines, and cloud infrastructure.",
		"Current interests: AWS, TypeScript, CI/CD...",
		"This site is a small fake shell because normal portfolios are a bit boring.",
	],
	projects: [
		{
			name: "Project Alpha",
			desc: "Short punchy description. What problem, what stack, what impact.",
			link: "https://github.com/your-handle/project-alpha",
			tags: ["TypeScript", "AWS", "CDK"],
		},
		{
			name: "Project Beta",
			desc: "Another one. Keep it outcome-focused.",
			link: "https://example.com",
			tags: ["NestJS", "Postgres"],
		},
	],
	skills: ["TypeScript", "AWS"],
	roles: [
		{
			title: "Software Engineer",
			company: "Tech Company",
			location: "Leeds, UK",
			startDate: "Jan 2020",
			endDate: "Jun 2021",
			description:
				"Describe your role and achievements here. Focus on impact and outcomes.",
		},
		{
			title: "Software Engineer II",
			company: "Tech Company 2",
			location: "Leeds, UK",
			startDate: "Jun 2021",
		},
	],
};
