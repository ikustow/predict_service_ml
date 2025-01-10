import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import { predictOrdersWithStats } from './services/predictionService';
import { PredictionRequest } from './models/PredictionRequest';
import { OrderData, QueryData } from './models/OrderData';

const app = express();
const port = 3000;

// Middleware for JSON parsing
app.use(bodyParser.json());

// Endpoint for predictions
// @ts-ignore
app.post('/predict', async (req: Request, res: Response) => {
    try {
        // Получаем тело запроса как массив
        const requestData: { orders: { data: OrderData[] }[]; query: { query: string }[] }[] = req.body;

        // Проверяем, что массив содержит данные
        if (!requestData || requestData.length === 0) {
            return res.status(400).json({ error: 'Invalid input structure' });
        }

        // Извлекаем `orders` и `query` из первого элемента массива
        const { orders, query } = requestData[0];

        if (!orders || !query || orders.length === 0 || query.length === 0) {
            return res.status(400).json({ error: 'Orders or query is missing' });
        }

        // Объединяем все заказы в один массив
        const flattenedOrders = orders.flatMap(orderGroup => orderGroup.data);

        // Парсим первый запрос из `query`
        const parsedQuery = JSON.parse(query[0].query);

        // Проверяем валидность запроса
        if (!parsedQuery.prediction_type || !parsedQuery.quantity || parsedQuery.quantity <= 0) {
            return res.status(400).json({ error: 'Invalid query parameters' });
        }

        // Выполняем предсказание
        const { predictions, products } = predictOrdersWithStats(flattenedOrders, parsedQuery.prediction_type, parsedQuery.quantity);

        // Формируем ответ
        return res.status(200).json({
            predictions: predictions.map((value, index) => {
                const futureDate = new Date();
                switch (parsedQuery.prediction_type) {
                    case 'day':
                        futureDate.setDate(futureDate.getDate() + index + 1);
                        break;
                    case 'month':
                        futureDate.setMonth(futureDate.getMonth() + index + 1);
                        break;
                    case 'year':
                        futureDate.setFullYear(futureDate.getFullYear() + index + 1);
                        break;
                }

                return {
                    date: futureDate.toISOString(),
                    predicted_value: value,
                    period: parsedQuery.prediction_type,
                    type: 'orders',
                    products,
                };
            }),
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Test endpoint to check service health
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', message: 'Service is running' });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
