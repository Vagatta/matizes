import fs from 'node:fs/promises';
import path from 'node:path';

const templateRoot = path.resolve(
	'..',
	'Bagery Pack',
	'Bagery'
);

const astroRoot = path.resolve('.');
const srcPagesDir = path.join(astroRoot, 'src', 'pages');

const htmlFiles = [
	'about-element-1.html',
	'about-element-2.html',
	'about.html',
	'blog-details.html',
	'blog-grid.html',
	'blog-masonry.html',
	'blog-standard.html',
	'cart.html',
	'checkout.html',
	'clients-element.html',
	'contact.html',
	'error.html',
	'faq.html',
	'feature-element-1.html',
	'feature-element-2.html',
	'gallery-1.html',
	'gallery-2.html',
	'gallery-3.html',
	'index-2.html',
	'index-3.html',
	'index-4.html',
	'index-onepage.html',
	'index-rtl.html',
	'index.html',
	'news-element-1.html',
	'news-element-2.html',
	'our-menu.html',
	'project-element-1.html',
	'project-element-2.html',
	'service-element-1.html',
	'service-element-2.html',
	'service.html',
	'shop-1.html',
	'shop-2.html',
	'shop-details.html',
	'shop-element-1.html',
	'shop-element-2.html',
	'team-element-1.html',
	'team-element-2.html',
	'team.html',
	'testimonial-element.html',
	'testimonial.html',
];

function fileToRoute(fileName) {
	if (fileName === 'index.html') return '/';
	return '/' + fileName.replace(/\.html$/i, '');
}

function fileToAstroPagePath(fileName) {
	if (fileName === 'index.html') return path.join(srcPagesDir, 'index.astro');
	return path.join(srcPagesDir, fileName.replace(/\.html$/i, '.astro'));
}

function rewriteLinks(html) {
	let out = html;

	// assets/ -> /assets/
	out = out.replace(/(href|src)=("|')assets\//gi, '$1=$2/assets/');

	// url(assets/...) -> url(/assets/...)
	out = out.replace(/url\(("|')?assets\//gi, 'url($1/assets/');

	// inline style background-image:url(assets/...) is covered by url(...)

	// Replace internal .html links with route paths (keep external links unchanged)
	out = out.replace(/href=("|')([^"']+?\.html)(\1)/gi, (m, q, href, q2) => {
		// ignore http(s), mailto, tel, hashes
		if (/^(https?:)?\/\//i.test(href)) return m;
		if (/^(mailto:|tel:|#)/i.test(href)) return m;

		const normalized = href.replace(/^\.\//, '');
		const route = fileToRoute(normalized);
		return `href=${q}${route}${q2}`;
	});

	return out;
}

function rewriteBranding(html) {
	let out = html;
	out = out.replace(/\bBAGERY\b/g, 'MATIZES');
	out = out.replace(/\bBagery\b/g, 'Matizes');
	out = out.replace(/\bbagery\b/g, 'matizes');
	return out;
}

function extractTitle(html) {
	const m = html.match(/<title>([\s\S]*?)<\/title>/i);
	const raw = (m?.[1] ?? 'Matizes').trim();
	return rewriteBranding(raw);
}

function extractBody(html) {
	const start = html.search(/<body[^>]*>/i);
	const end = html.search(/<\/body>/i);
	if (start === -1 || end === -1 || end <= start) {
		throw new Error('Could not find <body>...</body> in HTML');
	}
	const bodyOpenEnd = html.indexOf('>', start);
	return html.slice(bodyOpenEnd + 1, end);
}

async function main() {
	await fs.mkdir(srcPagesDir, { recursive: true });

	for (const fileName of htmlFiles) {
		// Keep src/pages/index.astro customized (hero, branding, etc.)
		if (fileName === 'index.html') {
			continue;
		}
		const srcPath = path.join(templateRoot, fileName);
		const html = await fs.readFile(srcPath, 'utf8');

		const title = extractTitle(html);
		let body = extractBody(html);
		body = rewriteBranding(rewriteLinks(body));

		const astroPage = `---\nimport BageryLayout from '../layouts/BageryLayout.astro';\n\nconst title = ${JSON.stringify(title)};\n---\n\n<BageryLayout title={title}>\n\t<Fragment set:html={${JSON.stringify(body)}} />\n</BageryLayout>\n`;

		const outPath = fileToAstroPagePath(fileName);
		await fs.writeFile(outPath, astroPage, 'utf8');
	}

	// Copy sendemail.php into public so it's available (note: Astro won't execute PHP)
	try {
		const phpSrc = path.join(templateRoot, 'sendemail.php');
		const phpOut = path.join(astroRoot, 'public', 'sendemail.php');
		await fs.copyFile(phpSrc, phpOut);
	} catch {
		// ignore
	}

	console.log(`Migrated ${htmlFiles.length} pages into src/pages`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
