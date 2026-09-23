import pytest
import io

def test_health_check(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["ok", "degraded"]

def test_auth_and_user_flow(client):
    # Register user 1
    u1_payload = {"username": "alice", "email": "alice@example.com", "password": "password123"}
    r1 = client.post("/api/auth/register", json=u1_payload)
    assert r1.status_code == 201
    d1 = r1.json()
    assert "access_token" in d1
    token1 = d1["access_token"]
    headers1 = {"Authorization": f"Bearer {token1}"}

    # Register user 2
    u2_payload = {"username": "bob", "email": "bob@example.com", "password": "password123"}
    r2 = client.post("/api/auth/register", json=u2_payload)
    assert r2.status_code == 201
    token2 = r2.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    # Get Me
    me_res = client.get("/api/users/me", headers=headers1)
    assert me_res.status_code == 200
    assert me_res.json()["username"] == "alice"

    # Search User
    search_res = client.get("/api/users/search?q=bob", headers=headers1)
    assert search_res.status_code == 200
    assert len(search_res.json()) == 1
    assert search_res.json()[0]["username"] == "bob"

    # Create Private Conversation
    bob_id = search_res.json()[0]["id"]
    conv_res = client.post("/api/conversations", json={"type": "private", "target_user_id": bob_id}, headers=headers1)
    assert conv_res.status_code == 201
    conv_id = conv_res.json()["id"]

    # Send Message
    msg_res = client.post(f"/api/conversations/{conv_id}/messages", json={"content": "Hello Bob!"}, headers=headers1)
    assert msg_res.status_code == 201
    msg_id = msg_res.json()["id"]
    assert msg_res.json()["content"] == "Hello Bob!"

    # List Messages (Bob's view)
    bob_msgs = client.get(f"/api/conversations/{conv_id}/messages", headers=headers2)
    assert bob_msgs.status_code == 200
    assert len(bob_msgs.json()) == 1

    # Search Messages
    s_msg = client.get("/api/messages/search?q=Hello", headers=headers1)
    assert s_msg.status_code == 200
    assert s_msg.json()["total"] == 1

    # Delete Message
    del_res = client.delete(f"/api/messages/{msg_id}", headers=headers1)
    assert del_res.status_code == 200

def test_file_upload(client):
    # Register & Login
    u_payload = {"username": "charlie", "email": "charlie@example.com", "password": "password123"}
    r = client.post("/api/auth/register", json=u_payload)
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Upload test image
    file_data = io.BytesIO(b"fake image bytes")
    files = {"file": ("test.png", file_data, "image/png")}
    up_res = client.post("/api/uploads", files=files, headers=headers)
    assert up_res.status_code == 201
    up_json = up_res.json()
    assert up_json["filename"] == "test.png"
    assert up_json["file_type"] == "image"

def test_group_chat_and_notifications(client):
    # Register user 1 (Admin) & user 2 (Member)
    r1 = client.post("/api/auth/register", json={"username": "dev1", "email": "dev1@example.com", "password": "password123"})
    t1 = r1.json()["access_token"]
    h1 = {"Authorization": f"Bearer {t1}"}

    r2 = client.post("/api/auth/register", json={"username": "dev2", "email": "dev2@example.com", "password": "password123"})
    u2_id = r2.json()["user"]["id"]
    t2 = r2.json()["access_token"]
    h2 = {"Authorization": f"Bearer {t2}"}

    # Create Group
    g_res = client.post("/api/conversations", json={"type": "group", "name": "Dev Team", "member_ids": [u2_id]}, headers=h1)
    assert g_res.status_code == 201
    group_id = g_res.json()["id"]

    # Dev2 receives notification
    notif_res = client.get("/api/notifications", headers=h2)
    assert notif_res.status_code == 200
    assert len(notif_res.json()) >= 1
