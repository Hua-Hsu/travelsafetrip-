export default function Home() {
  return (
    <div style={{textAlign: "center", padding: "50px"}}>
      <h1>Group Project</h1>
      <p style={{fontSize: "18px", color: "#666", marginTop: "10px"}}>
        Easily create and join groups with QR codes and invite codes
      </p>
      <div style={{marginTop: "30px"}}>
        <a href="/create" style={{padding: "10px 20px", background: "blue", color: "white", marginRight: "10px", textDecoration: "none", borderRadius: "8px"}}>Create Group</a>
        <a href="/join" style={{padding: "10px 20px", background: "green", color: "white", textDecoration: "none", borderRadius: "8px"}}>Join Group</a>
      </div>
    </div>
  );
}
