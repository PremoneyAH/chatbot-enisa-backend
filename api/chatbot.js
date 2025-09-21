const { Client } = require('@notionhq/client');

const notion = new Client({
    auth: process.env.NOTION_TOKEN,
    notionVersion: '2022-06-28' // Versión específica para tokens ntn_
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

        console.log('Buscando en Notion para:', message);
        const answer = await searchInNotion(message);
        
        return res.status(200).json({
            success: true,
            answer: answer,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error en chatbot:', error);
        return res.status(500).json({
            error: 'Error interno del servidor',
            fallback: 'Lo siento, ha ocurrido un error técnico. Por favor, contacta con nuestro equipo para una consulta personalizada sobre financiación ENISA.'
        });
    }
};

async function searchInNotion(userMessage) {
    try {
        console.log('Consultando base de datos:', DATABASE_ID);
        
        const response = await notion.databases.query({
            database_id: DATABASE_ID,
            filter: {
                property: 'Activo',
                checkbox: {
                    equals: true
                }
            }
        });

        console.log('Resultados encontrados:', response.results.length);
        
        const entries = response.results;
        const messageLower = userMessage.toLowerCase();
        
        let bestMatch = null;
        let maxScore = 0;

        for (const entry of entries) {
            const score = calculateRelevanceScore(entry, messageLower);
            if (score > maxScore) {
                maxScore = score;
                bestMatch = entry;
            }
        }

        console.log('Mejor puntuación:', maxScore);

        if (bestMatch && maxScore > 0.1) { // Umbral más bajo para testing
            return extractAnswer(bestMatch);
        }

        return "No he encontrado información específica sobre tu consulta. Te recomiendo que contactes directamente con nuestro equipo de consultores para una asesoría personalizada sobre financiación ENISA.";
        
    } catch (error) {
        console.error('Error consultando Notion:', error);
        throw error;
    }
}

function calculateRelevanceScore(entry, userMessage) {
    let score = 0;
    
    try {
        const pregunta = getPlainText(entry.properties.Pregunta);
        const keywords = getMultiSelect(entry.properties.Keywords);
        
        // Buscar keywords
        keywords.forEach(keyword => {
            if (userMessage.includes(keyword.toLowerCase())) {
                score += 0.3;
            }
        });
        
        // Buscar palabras en la pregunta
        const preguntaWords = pregunta.toLowerCase().split(' ');
        const messageWords = userMessage.split(' ');
        
        preguntaWords.forEach(word => {
            if (word.length > 3 && messageWords.some(mWord => mWord.includes(word))) {
                score += 0.2;
            }
        });
        
        return score;
        
    } catch (error) {
        console.error('Error calculando relevancia:', error);
        return 0;
    }
}

function extractAnswer(entry) {
    try {
        return getPlainText(entry.properties.Respuesta);
    } catch (error) {
        console.error('Error extrayendo respuesta:', error);
        return "Error al procesar la respuesta.";
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

function getMultiSelect(property) {
    if (!property || property.type !== 'multi_select') return [];
    return property.multi_select.map(item => item.name);
}
