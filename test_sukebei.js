import * as cheerio from 'cheerio';

async function testSukebei(code) {
    const url = `https://sukebei.nyaa.si/?f=0&c=0_0&q=${code}`;
    console.log(`Searching: ${url}`);

    try {
        const response = await fetch(url);
        const html = await response.text();
        const $ = cheerio.load(html);

        const results = [];

        $('table.torrent-list tbody tr').each((i, elem) => {
            const $tds = $(elem).find('td');
            if ($tds.length < 2) return;

            // Title
            const title = $tds.eq(1).find('a').not('.comments').text().trim();
            const viewLink = 'https://sukebei.nyaa.si' + $tds.eq(1).find('a').not('.comments').attr('href');

            // Magnet
            const magnet = $tds.eq(2).find('a[href^="magnet:"]').attr('href');

            // Size
            const size = $tds.eq(3).text().trim();

            // Date
            const date = $tds.eq(4).text().trim();

            // Seeders
            const seeders = parseInt($tds.eq(5).text().trim()) || 0;

            // Leechers
            const leechers = parseInt($tds.eq(6).text().trim()) || 0;

            // Downloads
            const downloads = parseInt($tds.eq(7).text().trim()) || 0;

            if (magnet) {
                results.push({
                    title,
                    link: magnet,
                    size,
                    date,
                    seeders,
                    leechers,
                    downloads,
                    viewLink
                });
            }
        });

        console.log(`Found ${results.length} results.`);
        if (results.length > 0) {
            console.log('First result:', results[0]);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

testSukebei('HEYZO-3752');
