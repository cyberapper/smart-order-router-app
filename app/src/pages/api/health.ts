import type { NextApiRequest, NextApiResponse } from 'next'

type HealthResponse = {
    status: 'ok' | 'error'
    timestamp: string
    service: string
    version: string
}

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse<HealthResponse>
) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        res.status(405).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            service: 'smart-order-router-api',
            version: '0.1.0'
        })
        return
    }

    // Return health status
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'smart-order-router-api',
        version: '0.1.0'
    })
}

