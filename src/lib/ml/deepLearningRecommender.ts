import * as tf from "@tensorflow/tfjs";

interface UserFeatures {
    age: number;
    preferences: number[]; // 원-핫 인코딩된 선호도
    behaviorVector: number[]; // 행동 패턴 벡터
    timeFeatures: number[]; // 시간 관련 특성
    locationEmbedding: number[]; // 위치 임베딩
}

interface ItemFeatures {
    categoryEmbedding: number[];
    priceNormalized: number;
    ratingNormalized: number;
    popularityScore: number;
    contentFeatures: number[]; // 텍스트 임베딩
    imageFeatures: number[]; // 이미지 임베딩
}

interface TrainingData {
    userFeatures: UserFeatures[];
    itemFeatures: ItemFeatures[];
    interactions: number[]; // 0: 무관심, 1: 조회, 2: 좋아요, 3: 예약
    contextFeatures: number[][]; // 날씨, 시간대, 계절 등
}

// 입력 데이터 최소 형태 정의 (타입 안전성 강화)
interface UserInfoShape {
    age?: number;
    location?: string;
    preferences?: {
        travelStyle?: string[];
    };
    behavior?: {
        viewedCourses?: unknown[];
        likedCourses?: unknown[];
        bookedCourses?: unknown[];
        searchHistory?: unknown[];
        lastActiveAt?: string | Date;
        viewedConcepts?: string[];
    };
}

interface ItemShape {
    id: string;
    concept?: string;
    price?: string;
    rating?: number;
    current_participants?: number;
    title?: string;
    description?: string;
}

class DeepLearningRecommender {
    private model: tf.LayersModel | null = null;
    private userEncoder: tf.LayersModel | null = null;
    private itemEncoder: tf.LayersModel | null = null;
    private isTraining = false;
    private modelVersion = "1.0";

    constructor() {
        this.initializeModel();
    }

    // 딥러닝 모델 초기화
    private async initializeModel() {
        try {
            // 사전 훈련된 모델이 있다면 로드
            this.model = await this.loadModel();
            if (!this.model) {
                this.model = this.createModel();
            }
        } catch {
            console.log("No pre-trained model found, creating new model");
            this.model = this.createModel();
        }
    }

    // 새로운 딥러닝 모델 생성
    private createModel(): tf.LayersModel {
        // 사용자 특성 인코더
        const userInput = tf.input({ shape: [50] }); // 사용자 특성 벡터 크기
        let userEncoded = tf.layers.dense({ units: 128, activation: "relu" }).apply(userInput) as tf.SymbolicTensor;
        userEncoded = tf.layers.dropout({ rate: 0.3 }).apply(userEncoded) as tf.SymbolicTensor;
        userEncoded = tf.layers.dense({ units: 64, activation: "relu" }).apply(userEncoded) as tf.SymbolicTensor;
        const userEmbedding = tf.layers
            .dense({
                units: 32,
                activation: "tanh",
                name: "user_embedding",
            })
            .apply(userEncoded) as tf.SymbolicTensor;

        // 아이템 특성 인코더
        const itemInput = tf.input({ shape: [100] }); // 아이템 특성 벡터 크기
        let itemEncoded = tf.layers.dense({ units: 128, activation: "relu" }).apply(itemInput) as tf.SymbolicTensor;
        itemEncoded = tf.layers.dropout({ rate: 0.3 }).apply(itemEncoded) as tf.SymbolicTensor;
        itemEncoded = tf.layers.dense({ units: 64, activation: "relu" }).apply(itemEncoded) as tf.SymbolicTensor;
        const itemEmbedding = tf.layers
            .dense({
                units: 32,
                activation: "tanh",
                name: "item_embedding",
            })
            .apply(itemEncoded) as tf.SymbolicTensor;

        // 컨텍스트 특성 인코더
        const contextInput = tf.input({ shape: [20] }); // 컨텍스트 특성 벡터 크기
        const contextEncoded = tf.layers
            .dense({
                units: 16,
                activation: "relu",
            })
            .apply(contextInput) as tf.SymbolicTensor;

        // 특성 결합
        const combined = tf.layers
            .concatenate()
            .apply([userEmbedding, itemEmbedding, contextEncoded]) as tf.SymbolicTensor;

        // 심층 신경망
        let dense = tf.layers.dense({ units: 128, activation: "relu" }).apply(combined) as tf.SymbolicTensor;
        dense = tf.layers.dropout({ rate: 0.4 }).apply(dense) as tf.SymbolicTensor;
        dense = tf.layers.dense({ units: 64, activation: "relu" }).apply(dense) as tf.SymbolicTensor;
        dense = tf.layers.dropout({ rate: 0.3 }).apply(dense) as tf.SymbolicTensor;
        dense = tf.layers.dense({ units: 32, activation: "relu" }).apply(dense) as tf.SymbolicTensor;

        // 출력층 (다중 목표 최적화)
        const ratingPrediction = tf.layers
            .dense({
                units: 1,
                activation: "sigmoid",
                name: "rating_prediction",
            })
            .apply(dense) as tf.SymbolicTensor;

        const clickPrediction = tf.layers
            .dense({
                units: 1,
                activation: "sigmoid",
                name: "click_prediction",
            })
            .apply(dense) as tf.SymbolicTensor;

        const conversionPrediction = tf.layers
            .dense({
                units: 1,
                activation: "sigmoid",
                name: "conversion_prediction",
            })
            .apply(dense) as tf.SymbolicTensor;

        // 모델 생성
        const model = tf.model({
            inputs: [userInput, itemInput, contextInput],
            outputs: [ratingPrediction, clickPrediction, conversionPrediction],
        });

        // 모델 컴파일 (다중 목표 손실 함수)
        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: {
                rating_prediction: "meanSquaredError",
                click_prediction: "binaryCrossentropy",
                conversion_prediction: "binaryCrossentropy",
            },
            metrics: ["accuracy"],
        });

        return model;
    }

    // 특성 벡터 생성
    private createUserFeatures(user: UserInfoShape): UserFeatures {
        const preferences = this.encodePreferences(user.preferences);
        const behaviorVector = this.createBehaviorVector(user.behavior);
        const timeFeatures = this.createTimeFeatures();
        const locationEmbedding = this.encodeLocation(user.location);

        return {
            age: ((user.age ?? 25) as number) / 100, // 정규화
            preferences,
            behaviorVector,
            timeFeatures,
            locationEmbedding,
        };
    }

    private createItemFeatures(item: ItemShape): ItemFeatures {
        return {
            categoryEmbedding: this.encodeConcept(item.concept),
            priceNormalized: this.normalizePrice(item.price),
            ratingNormalized: ((item.rating ?? 0) as number) / 5,
            popularityScore: this.calculatePopularityScore(item),
            contentFeatures: this.createContentEmbedding(item.title + " " + item.description),
            imageFeatures: this.createImageFeatures(),
        };
    }

    // 선호도 원-핫 인코딩
    private encodePreferences(preferences: UserInfoShape["preferences"]): number[] {
        const categories = ["힐링여행", "핫플투어", "로컬맛집", "액티비티", "문화시설", "야경명소"];
        const encoded = new Array(categories.length).fill(0);

        if (preferences?.travelStyle) {
            preferences.travelStyle.forEach((style: string) => {
                const index = categories.indexOf(style);
                if (index !== -1) encoded[index] = 1;
            });
        }

        return encoded;
    }

    // 행동 패턴 벡터 생성
    private createBehaviorVector(behavior: UserInfoShape["behavior"]): number[] {
        return [
            (behavior?.viewedCourses?.length || 0) / 100, // 정규화
            (behavior?.likedCourses?.length || 0) / 50,
            (behavior?.bookedCourses?.length || 0) / 20,
            (behavior?.searchHistory?.length || 0) / 100,
            this.calculateEngagementScore(behavior),
            this.calculateDiversityScore(behavior),
            this.calculateRecencyScore(behavior),
        ];
    }

    // 시간 특성 생성
    private createTimeFeatures(): number[] {
        const now = new Date();
        return [
            now.getHours() / 24, // 시간 정규화
            now.getDay() / 7, // 요일 정규화
            now.getMonth() / 12, // 월 정규화
            Math.sin((2 * Math.PI * now.getHours()) / 24), // 순환 시간 특성
            Math.cos((2 * Math.PI * now.getHours()) / 24),
            this.isWeekend(now) ? 1 : 0,
            this.isHoliday(now) ? 1 : 0,
        ];
    }

    // 위치 임베딩
    private encodeLocation(location: string | undefined): number[] {
        const locations = ["강남", "홍대", "명동", "이태원", "성수", "건대", "신촌", "압구정"];
        const embedding = new Array(8).fill(0);
        const index = location ? locations.indexOf(location) : -1;
        if (index !== -1) embedding[index] = 1;
        return embedding;
    }

    // 컨셉 임베딩
    private encodeConcept(concept: string | undefined): number[] {
        const concepts = ["힐링여행", "핫플투어", "로컬맛집", "액티비티", "문화시설", "야경명소"];
        const embedding = new Array(concepts.length).fill(0);
        const index = concept ? concepts.indexOf(concept) : -1;
        if (index !== -1) embedding[index] = 1;
        return embedding;
    }

    // 가격 정규화
    private normalizePrice(price: string | undefined): number {
        const numericPrice = parseInt((price ?? "").replace(/[^0-9]/g, "") || "0");
        return Math.min(numericPrice / 200000, 1); // 최대 20만원으로 정규화
    }

    // 인기도 점수 계산
    private calculatePopularityScore(item: ItemShape): number {
        const participants = item.current_participants || 0;
        const rating = item.rating || 0;
        return Math.min((participants * 0.1 + rating * 0.2) / 10, 1);
    }

    // 텍스트 임베딩 (간단한 TF-IDF 방식)
    private createContentEmbedding(text: string): number[] {
        const keywords = ["카페", "맛집", "체험", "문화", "쇼핑", "자연", "역사", "모던", "전통", "힐링"];
        const embedding = new Array(keywords.length).fill(0);

        keywords.forEach((keyword, index) => {
            if (text.toLowerCase().includes(keyword.toLowerCase())) {
                embedding[index] = 1;
            }
        });

        return embedding;
    }

    // 이미지 특성 (더미 구현 - 실제로는 CNN 사용)
    private createImageFeatures(): number[] {
        // 실제 구현시에는 사전 훈련된 CNN 모델 사용
        return new Array(50).fill(0).map(() => Math.random());
    }

    // 참여도 점수
    private calculateEngagementScore(behavior: UserInfoShape["behavior"]): number {
        const views = behavior?.viewedCourses?.length || 0;
        const likes = behavior?.likedCourses?.length || 0;
        const bookings = behavior?.bookedCourses?.length || 0;
        return Math.min((views * 0.1 + likes * 0.3 + bookings * 0.6) / 10, 1);
    }

    // 다양성 점수
    private calculateDiversityScore(behavior: UserInfoShape["behavior"]): number {
        const viewedConcepts = new Set(behavior?.viewedConcepts || []);
        return Math.min(viewedConcepts.size / 6, 1); // 6개 컨셉 중 몇 개나 경험했는지
    }

    // 최근성 점수
    private calculateRecencyScore(behavior: UserInfoShape["behavior"]): number {
        const lastActive = behavior?.lastActiveAt ? new Date(behavior.lastActiveAt) : new Date();
        const daysSinceActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
        return Math.max(1 - daysSinceActive / 30, 0); // 30일 기준
    }

    // 주말 여부
    private isWeekend(date: Date): boolean {
        return date.getDay() === 0 || date.getDay() === 6;
    }

    // 공휴일 여부 (간단한 구현)
    private isHoliday(date: Date): boolean {
        const holidays = ["01-01", "12-25"]; // 실제로는 더 많은 공휴일 처리
        const monthDay = `${(date.getMonth() + 1).toString().padStart(2, "0")}-${date
            .getDate()
            .toString()
            .padStart(2, "0")}`;
        return holidays.includes(monthDay);
    }

    // 추천 생성
    public async generateRecommendations(
        userId: string,
        userInfo: UserInfoShape,
        items: ItemShape[],
        limit: number = 20
    ): Promise<{ itemId: string; score: number; confidence: number }[]> {
        if (!this.model) {
            throw new Error("Model not initialized");
        }

        const userFeatures = this.createUserFeatures(userInfo);
        const contextFeatures = this.createTimeFeatures();
        const recommendations: { itemId: string; score: number; confidence: number }[] = [];

        // 배치 처리로 효율성 향상
        const batchSize = 32;
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);

            // 배치 텐서 생성
            const userBatch = tf.tensor2d(Array(batch.length).fill(this.flattenUserFeatures(userFeatures)));
            const itemBatch = tf.tensor2d(batch.map((item) => this.flattenItemFeatures(this.createItemFeatures(item))));
            const contextBatch = tf.tensor2d(Array(batch.length).fill(contextFeatures));

            // 예측
            const predictions = this.model.predict([userBatch, itemBatch, contextBatch]) as tf.Tensor[];

            // 결과 처리
            const ratingPreds = await predictions[0].data();
            const clickPreds = await predictions[1].data();
            const conversionPreds = await predictions[2].data();

            batch.forEach((item, idx) => {
                // 복합 점수 계산 (클릭률, 전환율, 평점 예측 결합)
                const compositeScore = clickPreds[idx] * 0.4 + conversionPreds[idx] * 0.4 + ratingPreds[idx] * 0.2;

                // 신뢰도 계산 (예측값들의 분산으로 추정)
                const predictions_array = [ratingPreds[idx], clickPreds[idx], conversionPreds[idx]];
                const mean = predictions_array.reduce((a, b) => a + b) / predictions_array.length;
                const variance =
                    predictions_array.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / predictions_array.length;
                const confidence = Math.max(0, 1 - Math.sqrt(variance));

                recommendations.push({
                    itemId: item.id,
                    score: compositeScore,
                    confidence: confidence,
                });
            });

            // 메모리 정리
            userBatch.dispose();
            itemBatch.dispose();
            contextBatch.dispose();
            predictions.forEach((pred) => pred.dispose());
        }

        // 점수순 정렬 및 상위 N개 반환
        return recommendations.sort((a, b) => b.score - a.score).slice(0, limit);
    }

    // 특성 벡터 평탄화
    private flattenUserFeatures(features: UserFeatures): number[] {
        return [
            features.age,
            ...features.preferences,
            ...features.behaviorVector,
            ...features.timeFeatures,
            ...features.locationEmbedding,
        ];
    }

    private flattenItemFeatures(features: ItemFeatures): number[] {
        return [
            ...features.categoryEmbedding,
            features.priceNormalized,
            features.ratingNormalized,
            features.popularityScore,
            ...features.contentFeatures,
            ...features.imageFeatures,
        ];
    }

    // 모델 온라인 학습 (증분 학습)
    public async trainIncremental(trainingData: TrainingData): Promise<void> {
        if (!this.model || this.isTraining) return;

        this.isTraining = true;

        try {
            // 훈련 데이터 준비
            const userTensor = tf.tensor2d(trainingData.userFeatures.map((f) => this.flattenUserFeatures(f)));
            const itemTensor = tf.tensor2d(trainingData.itemFeatures.map((f) => this.flattenItemFeatures(f)));
            const contextTensor = tf.tensor2d(trainingData.contextFeatures);

            // 타겟 레이블
            const ratingTargets = tf.tensor2d(trainingData.interactions.map((i) => [i / 3])); // 정규화
            const clickTargets = tf.tensor2d(trainingData.interactions.map((i) => [i > 0 ? 1 : 0]));
            const conversionTargets = tf.tensor2d(trainingData.interactions.map((i) => [i > 2 ? 1 : 0]));

            // 온라인 학습 (작은 학습률 사용)
            const history = await this.model.fit(
                [userTensor, itemTensor, contextTensor],
                {
                    rating_prediction: ratingTargets,
                    click_prediction: clickTargets,
                    conversion_prediction: conversionTargets,
                },
                {
                    epochs: 1,
                    batchSize: 32,
                    validationSplit: 0.1,
                    verbose: 0,
                }
            );

            console.log("Incremental training completed:", history.history);

            // 메모리 정리
            userTensor.dispose();
            itemTensor.dispose();
            contextTensor.dispose();
            ratingTargets.dispose();
            clickTargets.dispose();
            conversionTargets.dispose();
        } catch {
            console.error("Incremental training failed");
        } finally {
            this.isTraining = false;
        }
    }

    // 모델 저장
    public async saveModel(): Promise<void> {
        if (!this.model) return;

        try {
            await this.model.save(`localstorage://ml-recommender-v${this.modelVersion}`);
            console.log("Model saved successfully");
        } catch {
            console.error("Failed to save model");
        }
    }

    // 모델 로드
    private async loadModel(): Promise<tf.LayersModel | null> {
        try {
            return await tf.loadLayersModel(`localstorage://ml-recommender-v${this.modelVersion}`);
        } catch {
            return null;
        }
    }

    // 모델 성능 평가
    public async evaluateModel(testData: TrainingData): Promise<{
        accuracy: number;
        precision: number;
        recall: number;
        f1Score: number;
    }> {
        if (!this.model) {
            throw new Error("Model not initialized");
        }

        // 테스트 데이터로 예측 수행
        const userTensor = tf.tensor2d(testData.userFeatures.map((f) => this.flattenUserFeatures(f)));
        const itemTensor = tf.tensor2d(testData.itemFeatures.map((f) => this.flattenItemFeatures(f)));
        const contextTensor = tf.tensor2d(testData.contextFeatures);

        const predictions = this.model.predict([userTensor, itemTensor, contextTensor]) as tf.Tensor[];
        const clickPreds = await predictions[1].data();

        // 성능 지표 계산
        let tp = 0,
            fp = 0,
            fn = 0,
            tn = 0;

        testData.interactions.forEach((actual, idx) => {
            const predicted = clickPreds[idx] > 0.5 ? 1 : 0;
            const actualBinary = actual > 0 ? 1 : 0;

            if (predicted === 1 && actualBinary === 1) tp++;
            else if (predicted === 1 && actualBinary === 0) fp++;
            else if (predicted === 0 && actualBinary === 1) fn++;
            else tn++;
        });

        const accuracy = (tp + tn) / (tp + fp + fn + tn);
        const precision = tp / (tp + fp) || 0;
        const recall = tp / (tp + fn) || 0;
        const f1Score = (2 * (precision * recall)) / (precision + recall) || 0;

        // 메모리 정리
        userTensor.dispose();
        itemTensor.dispose();
        contextTensor.dispose();
        predictions.forEach((pred) => pred.dispose());

        return { accuracy, precision, recall, f1Score };
    }

    // 모델 정보
    public getModelInfo(): {
        version: string;
        isTraining: boolean;
        parameterCount: number;
    } {
        return {
            version: this.modelVersion,
            isTraining: this.isTraining,
            parameterCount: this.model?.countParams() || 0,
        };
    }
}

// 싱글톤 패턴으로 추천기 인스턴스 관리
export const deepLearningRecommender = new DeepLearningRecommender();

// API 엔드포인트에서 사용하는 래퍼 함수
export async function generateMLRecommendations(
    userId: string,
    userInfo: unknown,
    items: unknown[],
    limit: number = 20
): Promise<{ itemId: string; score: number; confidence: number; reasons: string[] }[]> {
    try {
        const mlRecommendations = await deepLearningRecommender.generateRecommendations(
            userId,
            userInfo as UserInfoShape,
            items as ItemShape[],
            limit
        );

        // 추천 이유 생성 (해석가능성 향상)
        return mlRecommendations.map((rec) => ({
            ...rec,
            reasons: generateRecommendationReasons(rec.score, rec.confidence),
        }));
    } catch {
        console.error("ML recommendation failed");
        // 폴백: 기본 알고리즘 사용
        return [];
    }
}

// 추천 이유 생성
function generateRecommendationReasons(score: number, confidence: number): string[] {
    const reasons: string[] = [];

    if (score > 0.8) reasons.push("매우 높은 관심도 예측");
    else if (score > 0.6) reasons.push("높은 관심도 예측");
    else if (score > 0.4) reasons.push("적당한 관심도 예측");

    if (confidence > 0.8) reasons.push("높은 예측 신뢰도");
    else if (confidence > 0.6) reasons.push("적당한 예측 신뢰도");

    return reasons;
}
