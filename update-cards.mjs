import { readFile, writeFile } from 'node:fs/promises';

const OWNER = 'shubhanshurav';

const CARDS = [ 
  { file: 'card-interview-notes.svg', repo: 'Interview-Preparation-Notes' },
  { file: 'card-dot-batch.svg', repo: 'DOT-BATCH' },
  { file: 'card-netflixgpt.svg', repo: 'NetflixGPT' },
  { file: 'card-eshop.svg', repo: 'e-Shopping-store' },
];

const formatCount = (n) =>
  n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n);

const setStat = (svg, stat, value) => {
  const pattern = new RegExp(`(<text[^>]*data-stat="${stat}"[^>]*>)[^<]*(</text>)`);
  if (!pattern.test(svg)) return null;
  return svg.replace(pattern, `$1${value}$2`);
};

const fetchRepo = async (repo) => {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'profile-card-updater',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${repo}`, { headers });
  if (!res.ok) {
    throw new Error(`GitHub API returned ${res.status} for ${repo}`);
  }
  return res.json();
};

let failures = 0;

for (const { file, repo } of CARDS) {
  try {
    const data = await fetchRepo(repo);
    const original = await readFile(file, 'utf8');

    const withStars = setStat(original, 'stars', formatCount(data.stargazers_count));
    if (!withStars) {
      throw new Error(`no data-stat="stars" element found in ${file}`);
    }

    const withForks = setStat(withStars, 'forks', formatCount(data.forks_count));
    const updated = withForks ?? withStars;

    if (updated !== original) {
      await writeFile(file, updated);
      console.log(`updated ${file}: stars=${data.stargazers_count} forks=${data.forks_count}`);
    } else {
      console.log(`unchanged ${file}`);
    }
  } catch (err) {
    failures += 1;
    console.error(`skipped ${repo}: ${err.message}`);
  }
}

if (failures === CARDS.length) {
  process.exit(1);
}
