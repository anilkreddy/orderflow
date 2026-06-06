FROM gradle:9.5.0-jdk21 AS builder

WORKDIR /home/gradle/project

COPY --chown=gradle:gradle . .

RUN gradle :product-service:bootJar --no-daemon

FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=builder /home/gradle/project/product-service/build/libs/*.jar app.jar

EXPOSE 8081

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
