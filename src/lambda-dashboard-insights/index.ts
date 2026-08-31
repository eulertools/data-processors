export async function handler(event: any, context: any) {
  console.log("region 👉", process.env.REGION);
  console.log("availability zones 👉", process.env.AVAILABILITY_ZONES);

  return {
    body: JSON.stringify({ message: "SUCCESS 🎉" }),
    statusCode: 200,
  };
}
