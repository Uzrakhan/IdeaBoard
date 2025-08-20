import User from "../models/User"

export function generateUsername(baseName: any) {
    let username = baseName.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");


}