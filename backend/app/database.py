from typing import Dict, Optional, List
import uuid
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# In-memory database
users_db: Dict[str, Dict] = {}


def get_user_by_email(email: str) -> Optional[Dict]:
    for user_id, user in users_db.items():
        if user["email"] == email:
            return {**user, "id": user_id}
    return None


def create_user(email: str, password: str) -> Dict:
    hashed_password = pwd_context.hash(password)
    user_id = str(uuid.uuid4())
    users_db[user_id] = {
        "email": email,
        "hashed_password": hashed_password,
        "fullName": None,
        "username": None,
        "website": None
    }
    return {**users_db[user_id], "id": user_id}


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def update_user(user_id: str, update_data: Dict) -> Optional[Dict]:
    if user_id not in users_db:
        return None
    
    for key, value in update_data.items():
        if value is not None and key != "id" and key != "email" and key != "hashed_password":
            users_db[user_id][key] = value
    
    return {**users_db[user_id], "id": user_id} 