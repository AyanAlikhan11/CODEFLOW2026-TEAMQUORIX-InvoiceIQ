import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase-admin"
import { db } from "@/lib/db"

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

    // Create Firebase user
    const firebaseUser = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    })

    // Optional Prisma user profile
    const user = await db.user.create({
      data: {
        id: firebaseUser.uid,
        name,
        email,
        company: company || "",
        avatar: "",
        role: "user",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    })

    return NextResponse.json({
      success: true,
      user,
    })
  } catch (error: unknown) {
    console.error("[Signup Error]", error)

    const message =
      error instanceof Error
        ? error.message
        : "Signup failed"

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}