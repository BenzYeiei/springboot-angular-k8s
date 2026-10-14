pipeline {
    agent any

    environment {
        IMAGE_BACKEND  = 'springboot-angular-k8s-backend'
        IMAGE_FRONTEND = 'springboot-angular-k8s-frontend'
        IMAGE_TAG      = "${env.BRANCH_NAME}-${env.BUILD_NUMBER}"
    }

    stages {

        stage('Set Environment') {
            steps {
                script {
                    switch (env.BRANCH_NAME) {
                        case 'sit': env.DEPLOY_ENV = 'sit'; break
                        case 'uat': env.DEPLOY_ENV = 'uat'; break
                        default:    env.DEPLOY_ENV = 'dev'
                    }
                    echo "Branch: ${env.BRANCH_NAME}  →  K8s namespace: ${env.DEPLOY_ENV}"
                }
            }
        }

        stage('Build') {
            parallel {
                stage('Backend') {
                    steps {
                        sh "docker build -t ${IMAGE_BACKEND}:${IMAGE_TAG} -f docker/Dockerfile.backend ."
                    }
                }
                stage('Frontend') {
                    steps {
                        sh "docker build -t ${IMAGE_FRONTEND}:${IMAGE_TAG} -f docker/Dockerfile.frontend ."
                    }
                }
            }
        }

        stage('Push Images') {
            when {
                anyOf { branch 'dev'; branch 'sit'; branch 'uat' }
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-credentials',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh """
                        echo \$DOCKER_PASS | docker login -u \$DOCKER_USER --password-stdin
                        docker tag ${IMAGE_BACKEND}:${IMAGE_TAG}  \$DOCKER_USER/${IMAGE_BACKEND}:${IMAGE_TAG}
                        docker tag ${IMAGE_FRONTEND}:${IMAGE_TAG} \$DOCKER_USER/${IMAGE_FRONTEND}:${IMAGE_TAG}
                        docker push \$DOCKER_USER/${IMAGE_BACKEND}:${IMAGE_TAG}
                        docker push \$DOCKER_USER/${IMAGE_FRONTEND}:${IMAGE_TAG}
                        docker logout
                    """
                }
            }
        }

        stage('Deploy to K8s') {
            when {
                anyOf { branch 'dev'; branch 'sit'; branch 'uat' }
            }
            steps {
                withCredentials([
                    file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG_FILE'),
                    usernamePassword(
                        credentialsId: 'dockerhub-credentials',
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )
                ]) {
                    sh """
                        export KUBECONFIG=\$KUBECONFIG_FILE

                        # Create namespace if not exists
                        kubectl get namespace ${env.DEPLOY_ENV} 2>/dev/null \
                            || kubectl create namespace ${env.DEPLOY_ENV}

                        # Apply all manifests with correct namespace
                        for f in k8s/01-secrets.yaml k8s/02-postgres.yaml \
                                 k8s/03-keycloak-realm.yaml k8s/03-keycloak.yaml \
                                 k8s/04-pgadmin.yaml \
                                 k8s/06-backend.yaml k8s/07-frontend.yaml k8s/08-ingress.yaml; do
                            sed 's/namespace: dev/namespace: ${env.DEPLOY_ENV}/g' "\$f" | kubectl apply -f -
                        done

                        # Update app images to newly built versions
                        kubectl set image deployment/backend  backend=\$DOCKER_USER/${IMAGE_BACKEND}:${IMAGE_TAG}  -n ${env.DEPLOY_ENV}
                        kubectl set image deployment/frontend frontend=\$DOCKER_USER/${IMAGE_FRONTEND}:${IMAGE_TAG} -n ${env.DEPLOY_ENV}

                        # Wait for rollout
                        kubectl rollout status deployment/backend  -n ${env.DEPLOY_ENV} --timeout=120s
                        kubectl rollout status deployment/frontend -n ${env.DEPLOY_ENV} --timeout=120s
                    """
                }
            }
        }
    }

    post {
        success {
            echo "Successfully deployed ${IMAGE_TAG} to namespace: ${env.DEPLOY_ENV}"
        }
        failure {
            echo "Pipeline failed — branch: ${env.BRANCH_NAME}, image: ${IMAGE_TAG}"
        }
        always {
            sh """
                docker rmi ${IMAGE_BACKEND}:${IMAGE_TAG}  || true
                docker rmi ${IMAGE_FRONTEND}:${IMAGE_TAG} || true
            """
        }
    }
}
