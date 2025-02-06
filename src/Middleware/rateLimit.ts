import { NextFunction, Request, Response } from "express"

export const rateLimit = (maxReqs: number, timeWindow: number) => {

    const requestLogs = new Map()

    return (req: Request, res: Response, next: NextFunction) => {
        const now = Date.now();
        const ip = req.ip;


        if (!requestLogs.has(ip)) {
            requestLogs.set(ip, [])
        }
        const timeStamps = requestLogs.get(ip)

        // timeStamps array will store the recent timestamps within the timeframe
        const timestamps = requestLogs.get(ip).filter((timeStamp: number) => now - timeStamp < timeWindow)
        if (timeStamps.length >= maxReqs) {
            res.send({ msg: "Max Requests reached." })
        }


        timestamps.push(now);
        requestLogs.set(ip, timestamps)
        next()
    }

}