class User:
    id: int
    username: str
    password: str
    admin: bool = False

    def __init__(self, id: int, username: str, password: str, admin: bool):
        self.id = id
        self.username = username
        self.password = password
        self.admin = admin
