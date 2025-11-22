"use client";

import React, { useEffect, useState } from "react";

type Particle = {
	id: number;
	left: number; // 0-100 (%)
	delay: number; // seconds
	duration: number; // seconds
	size: number; // px
	type: "star" | "heart";
};

export default function GiftParticleEffect() {
	const [showModal, setShowModal] = useState(true);
	const [giftOpened, setGiftOpened] = useState(false);
	const [particles, setParticles] = useState<Particle[]>([]);
	const [animate, setAnimate] = useState(false);

	useEffect(() => {
		setAnimate(true);
	}, []);

	const handleGiftClick = () => {
		setGiftOpened(true);
		const newParticles: Particle[] = Array.from({ length: 100 }).map((_, i) => ({
			id: i,
			left: Math.random() * 100,
			delay: Math.random() * 0.2,
			duration: 2 + Math.random() * 0.8,
			size: 10 + Math.random() * 4,
			type: Math.random() > 0.5 ? "star" : "heart",
		}));
		setParticles(newParticles);
	};

	return (
		<div
			style={{
				minHeight: "100vh",
				background: "#f5f5f5",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: "20px",
			}}
		>
			{showModal && (
				<div
					style={{
						position: "fixed",
						inset: "0",
						background: "rgba(0, 0, 0, 0.4)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 1000,
					}}
				>
					{giftOpened &&
						particles.map((particle) => (
							<div
								key={particle.id}
								style={{
									position: "fixed",
									left: `${particle.left}%`,
									top: "-20px",
									fontSize: particle.size,
									animation: `fallDown ${particle.duration}s linear ${particle.delay}s forwards`,
									pointerEvents: "none",
									zIndex: 999,
								}}
							>
								{particle.type === "star" ? "✨" : "💚"}
							</div>
						))}

					<div
						style={{
							background: "white",
							borderRadius: "28px",
							padding: "48px 32px",
							maxWidth: "340px",
							width: "100%",
							textAlign: "center",
							boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)",
							animation: animate
								? "modalSlideUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)"
								: "none",
							position: "relative",
							zIndex: 1001,
						}}
					>
						<div
							style={{
								marginBottom: "32px",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<svg viewBox="0 0 120 120" width="100" height="100" style={{ display: "block" }}>
								<circle
									cx="60"
									cy="60"
									r="55"
									fill="none"
									stroke="#26a853"
									strokeWidth="3"
									style={{
										animation: animate ? "circleStroke 0.8s ease-out forwards" : "none",
										opacity: 0,
									}}
								/>
								<path
									d="M40 60 L55 75 L85 40"
									fill="none"
									stroke="#26a853"
									strokeWidth="5"
									strokeLinecap="round"
									strokeLinejoin="round"
									style={{
										animation: animate ? "checkmarkDraw 0.8s ease-out 0.3s forwards" : "none",
										opacity: 0,
									}}
								/>
							</svg>
						</div>

						<h2
							style={{
								fontSize: "28px",
								fontWeight: 700,
								color: "#1a1a1a",
								margin: "0 0 16px 0",
								lineHeight: "1.3",
							}}
						>
							완료!
						</h2>

						<p
							style={{
								fontSize: "15px",
								color: "#666",
								margin: "0 0 36px 0",
								lineHeight: "1.6",
								fontWeight: 500,
							}}
						>
							7일 연속 출석 완료했어요
						</p>

						{!giftOpened ? (
							<div
								onClick={handleGiftClick}
								style={{
									background: "linear-gradient(135deg, #f0fdf4 0%, #f0fdf4 100%)",
									border: "2px solid #26a853",
									borderRadius: "16px",
									padding: "28px 24px",
									marginBottom: "36px",
									cursor: "pointer",
									transition: "all 0.2s ease",
									animation:
										animate && !giftOpened ? "giftShake 0.6s ease-in-out 0.8s infinite" : "none",
									position: "relative",
									overflow: "hidden",
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.background =
										"linear-gradient(135deg, #e6fce6 0%, #e6fce6 100%)";
									e.currentTarget.style.boxShadow = "0 8px 20px rgba(38, 168, 83, 0.15)";
									e.currentTarget.style.transform = "scale(1.02)";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.background =
										"linear-gradient(135deg, #f0fdf4 0%, #f0fdf4 100%)";
									e.currentTarget.style.boxShadow = "none";
									e.currentTarget.style.transform = "scale(1)";
								}}
							>
								<span
									style={{
										fontSize: "48px",
										display: "inline-block",
										animation:
											animate && !giftOpened
												? "giftBounce 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.8s infinite"
												: "none",
									}}
								>
									🎁
								</span>
								<div
									style={{
										fontSize: "12px",
										color: "#26a853",
										marginTop: "8px",
										fontWeight: 600,
										letterSpacing: "0.5px",
									}}
								>
									클릭해서 열기
								</div>
							</div>
						) : (
							<div
								style={{
									background: "linear-gradient(135deg, #f0fdf4 0%, #f0fdf4 100%)",
									border: "2px solid #26a853",
									borderRadius: "16px",
									padding: "28px 24px",
									marginBottom: "36px",
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									justifyContent: "center",
									gap: "12px",
									animation: "rewardReveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
								}}
							>
								<div
									style={{
										fontSize: "36px",
										animation: "rewardPop 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
									}}
								>
									🎁
								</div>
								<div style={{ textAlign: "center" }}>
									<div style={{ fontSize: "13px", color: "#666", marginBottom: "6px" }}>
										클릭해서 열기
									</div>
									<div style={{ fontSize: "18px", fontWeight: 700, color: "#26a853" }}>쿠폰 2개</div>
								</div>
							</div>
						)}

						<div
							style={{
								fontSize: "13px",
								color: "#999",
								marginBottom: "32px",
								paddingBottom: "32px",
								borderBottom: "1px solid #f0f0f0",
							}}
						>
							내일부터 <strong style={{ color: "#26a853" }}>새로운 7일</strong>이 시작돼요
						</div>

						<button
							onClick={() => setShowModal(false)}
							style={{
								width: "100%",
								background: giftOpened ? "#26a853" : "#a8d5a8",
								color: "white",
								border: "none",
								borderRadius: "14px",
								padding: "16px 24px",
								fontSize: "16px",
								fontWeight: 600,
								cursor: giftOpened ? "pointer" : "default",
								transition: "all 0.2s ease",
								boxShadow: giftOpened ? "0 4px 12px rgba(38, 168, 83, 0.2)" : "none",
							}}
							disabled={!giftOpened}
							onMouseEnter={(e) => {
								if (giftOpened) {
                                    (e.target as HTMLButtonElement).style.background = "#229c46";
                                    (e.target as HTMLButtonElement).style.boxShadow = "0 6px 16px rgba(38, 168, 83, 0.3)";
								}
							}}
							onMouseLeave={(e) => {
								if (giftOpened) {
                                    (e.target as HTMLButtonElement).style.background = "#26a853";
                                    (e.target as HTMLButtonElement).style.boxShadow = "0 4px 12px rgba(38, 168, 83, 0.2)";
								}
							}}
						>
							{giftOpened ? "확인" : "선물을 열어주세요"}
						</button>
					</div>
				</div>
			)}

			<style>{`
        @keyframes modalSlideUp {
          from {
            opacity: 0;
            transform: translateY(40px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes circleStroke {
          from {
            stroke-dasharray: 345;
            stroke-dashoffset: 345;
            opacity: 0;
          }
          to {
            stroke-dasharray: 345;
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }
        @keyframes checkmarkDraw {
          from {
            stroke-dasharray: 100;
            stroke-dashoffset: 100;
            opacity: 0;
          }
          to {
            stroke-dasharray: 100;
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }
        @keyframes giftShake {
          0%, 100% { transform: translateY(0) rotateZ(0deg); }
          25% { transform: translateY(-4px) rotateZ(-2deg); }
          50% { transform: translateY(-8px) rotateZ(2deg); }
          75% { transform: translateY(-4px) rotateZ(-1deg); }
        }
        @keyframes giftBounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes rewardReveal {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes rewardPop {
          0% { transform: scale(0) rotate(-30deg); opacity: 0; }
          50% { transform: scale(1.3) rotate(10deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes fallDown {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(100vh) rotate(360deg); }
        }
      `}</style>
		</div>
	);
}


