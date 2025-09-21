const { Client } = require('@notionhq/client');

const notion = new Client({
    auth: process.env.NOTION_TOKEN,
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID;

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
        
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required' });
        }

        console.log('SIMPLE TEST - DATABASE_ID:', DATABASE_ID);
        console.log('SIMPLE TEST - TOKEN exists:', !!process.env.NOTION_TOKEN);
        
        const answer = await searchInNotion(message);
        
        return res.status(200).json({
            success: true,
            answer: answer,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('SIMPLE TEST - Error:', error.message);
        return res.status(500).json({
            error: 'Error interno del servidor',
            fallback: 'Lo siento, ha ocurrido un error técnico. DATABASE_ID: ' + DATABASE_ID
        });
    }
};

async function searchInNotion(userMessage) {
    try {
        console.log('SIMPLE TEST - Consultando con ID:', DATABASE_ID);
        
        const response = await notion.databases.query({
            database_id: DATABASE_ID
        });

        console.log('SIMPLE TEST - Éxito! Registros encontrados:', response.results.length);
        
        const entries = response.results;
        
        if (entries.length === 0) {
            return "Base de datos encontrada pero vacía. Agrega registros a tu base de datos.";
        }

        // Devolver el primer registro como prueba
        const firstEntry = entries[0];
        const pregunta = getPlainText(firstEntry.properties.Pregunta);
        const respuesta = getPlainText(firstEntry.properties.Respuesta);
        
        return `✅ ¡Conexión exitosa! Ejemplo de registro: "${pregunta}" - ${respuesta.substring(0, 100)}...`;
        
    } catch (error) {
        console.error('SIMPLE TEST - Error en búsqueda:', error.message);
        throw error;
    }
}

function getPlainText(property) {
    if (!property) return '';
    
    switch (property.type) {
        case 'title':
            return property.title.map(text => text.plain_text).join('');
        case 'rich_text':
            return property.rich_text.map(text => text.plain_text).join('');
        default:
            return '';
    }
}
// Actualización forzada
