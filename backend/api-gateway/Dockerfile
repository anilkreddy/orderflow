FROM gradle:9.5.0-jdk25 AS builder

WORKDIR /home/gradle/project

COPY --chown=gradle:gradle . .

RUN gradle :api-gateway:bootJar --no-daemon

FROM eclipse-temurin:25-jre

WORKDIR /app

COPY --from=builder /home/gradle/project/api-gateway/build/libs/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
