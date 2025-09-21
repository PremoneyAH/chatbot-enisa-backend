const { Client } = require('@notionhq/client');

const notion = new Client({
    auth: process.env.NOTION_TOKEN,
    notionVersion: '2022-06-28'
});

let DATABASE_ID = process.env.NOTION_DATABASE_ID;

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

        console.log('=== DEBUG INFO ===');
        console.log('DATABASE_ID configurado:', DATABASE_ID);
        console.log('Longitud del ID:', DATABASE_ID ? DATABASE_ID.length : 'undefined');
        console.log('Token configurado:', process.env.NOTION_TOKEN ? 'SÍ' : 'NO');
        console.log('Mensaje recibido:', message);

        // Intentar con diferentes formatos del Database ID
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
            fallback: 'Lo siento, ha ocurrido un error técnico. Por favor, contacta con nuestro equipo para una consulta personalizada sobre financiación ENISA.',
            debug: {
                databaseId: DATABASE_ID,
                errorMessage: error.message,
                errorCode: error.code
            }
        });
    }
};

async function searchInNotion(userMessage) {
    try {
        // Probar diferentes formatos del Database ID
        const formats = [
            DATABASE_ID, // Original
            DATABASE_ID.replace(/-/g, ''), // Sin guiones
            addHyphensToId(DATABASE_ID), // Con guiones en formato UUID
        ];

        console.log('Intentando con formatos:', formats);

        for (let i = 0; i < formats.length; i++) {
            const currentId = formats[i];
            console.log(`Intento ${i + 1} con ID: ${currentId}`);
            
            try {
                const response = await notion.databases.query({
                    database_id: currentId,
                    filter: {
                        property: 'Activo',
                        checkbox: {
                            equals: true
                        }
                    }
                });

                console.log('✅ ¡Éxito! ID correcto:', currentId);
                console.log('Resultados encontrados:', response.results.length);
                
                // Si llegamos aquí, el ID funcionó
                DATABASE_ID = currentId; // Guardar el formato que funciona
                
                const entries = response.results;
                const messageLower = userMessage.toLowerCase();
                
                if (entries.length === 0) {
                    return "No hay registros activos en la base de datos. Verifica que tengas registros con el checkbox 'Activo' marcado.";
                }
                
                let bestMatch = null;
                let maxScore = 0;

                for (const entry of entries) {
                    const score = calculateRelevanceScore(entry, messageLower);
                    console.log('Puntuación para entrada:', score);
                    if (score > maxScore) {
                        maxScore = score;
                        bestMatch = entry;
                    }
                }

                console.log('Mejor puntuación:', maxScore);

                if (bestMatch && maxScore > 0.1) {
                    return extractAnswer(bestMatch);
                }

                return "He encontrado tu base de datos pero no hay coincidencias con tu pregunta. Prueba con palabras como 'requisitos', 'importe', 'avales', etc.";
                
            } catch (error) {
                console.log(`❌ Fallo con formato ${i + 1}:`, error.message);
                if (i === formats.length - 1) {
                    throw error; // Si es el último intento, lanzar error
                }
            }
        }
        
    } catch (error) {
        console.error('Error consultando Notion después de todos los intentos:', error);
        throw error;
    }
}

function addHyphensToId(id) {
    // Convertir a formato UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    if (id.length === 32 && !id.includes('-')) {
        return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
    }
    return id;
}

function calculateRelevanceScore(entry, userMessage) {
    let score = 0;
    
    try {
        const pregunta = getPlainText(entry.properties.Pregunta);
        const keywords = getMultiSelect(entry.properties.Keywords);
        
        console.log('Analizando entrada:', pregunta.substring(0, 50));
        
        keywords.forEach(keyword => {
            if (userMessage.includes(keyword.toLowerCase())) {
                score += 0.3;
                console.log('Keyword encontrada:', keyword);
            }
        });
        
        const preguntaWords = pregunta.toLowerCase().split(' ');
        const messageWords = userMessage.split(' ');
        
        preguntaWords.forEach(word => {
            if (word.length > 3 && messageWords.some(mWord => mWord.includes(word))) {
                score += 0.2;
                console.log('Palabra encontrada:', word);
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
        const answer = getPlainText(entry.properties.Respuesta);
        console.log('Respuesta extraída:', answer.substring(0, 100));
        return answer;
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
