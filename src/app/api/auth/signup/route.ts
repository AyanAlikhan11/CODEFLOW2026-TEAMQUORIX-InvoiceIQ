import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { name, email, password, company } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      )
    }

    // Create Firebase Auth user
    const firebaseUser = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    })

    // OPTIONAL: store extra data inside custom claims
    await adminAuth.setCustomUserClaims(firebaseUser.uid, {
      company: company || "",
      role: "user",
    })

    return NextResponse.json({
      success: true,
      user: {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName,
        company: company || "",
        role: "user",
      },
    })
  } catch (error: unknown) {
    console.error("[Signup Error]", error)

    const message =
      error instanceof Error ? error.message : "Signup failed"

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}