// (Code sama dengan sebelumnya, tidak perlu diubah karena res.render('pages/home')
//  sekarang otomatis dilayani oleh layout middleware).
const api = require('../services/apiClient');

const getCommonData = async (req) => {
    const lang = req.query.lang || req.cookies.lang || 'en';
    const languages = await api.getLanguages();
    return { lang, languages };
};

exports.home = async (req, res) => {
    const { lang, languages } = await getCommonData(req);
    const q = req.query.q;
    let shows = [];
    
    if (q) {
        shows = await api.search(q, lang);
    } else {
        shows = await api.getHome(lang);
    }
    
    res.render('pages/home', { 
        title: q ? `Search: ${q}` : 'Home', 
        shows, 
        languages, 
        activeLang: lang,
        searchQuery: q
    });
};

exports.showDetail = async (req, res) => {
    const { lang, languages } = await getCommonData(req);
    const { code } = req.params;
    const episodes = await api.getEpisodes(code, lang);
    let meta = { name: 'Unknown Title', cover: '', total: episodes.length };
    
    const playData = await api.getPlay(code, 1, lang);
    if (playData) {
        meta.name = playData.name;
        meta.total = playData.total;
    }

    res.render('pages/show', {
        title: meta.name,
        code,
        episodes,
        meta,
        languages,
        activeLang: lang
    });
};

exports.player = async (req, res) => {
    const { lang, languages } = await getCommonData(req);
    const { code } = req.params;
    const ep = req.query.ep || 1;
    const playData = await api.getPlay(code, ep, lang);
    
    if (!playData) {
        return res.render('pages/player', {
            title: 'Error',
            error: 'Episode not found or locked.',
            data: null,
            languages, 
            activeLang: lang
        });
    }

    res.render('pages/player', {
        title: `Watching: ${playData.name}`,
        data: playData,
        code,
        languages,
        activeLang: lang
    });
};
