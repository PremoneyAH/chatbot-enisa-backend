const { Client } = require('@notionhq/client');

const notion = new Client({
    auth: process.env.NOTION_TOKEN,
});

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message } = req.body;
        console.log('NUEVO CODIGO - Mensaje:', message);
        console.log('NUEVO CODIGO - Database ID:', process.env.NOTION_DATABASE_ID);
        
        const response = await notion.databases.query({
            database_id: process.env.NOTION_DATABASE_ID
        });

        console.log('NUEVO CODIGO - Éxito! Registros:', response.results.length);
        
        return res.status(200).json({
            success: true,
            answer: `Conexión exitosa con Notion. Encontrados ${response.results.length} registros.`,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('NUEVO CODIGO - Error:', error.message);
        return res.status(500).json({
            success: false,
            answer: 'Error: ' + error.message
        });
    }
};
