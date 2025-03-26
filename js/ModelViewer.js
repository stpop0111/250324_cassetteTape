import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EXRLoader } from "three/addons/loaders/EXRLoader.js";
import { MODEL_DATA } from "./Model.js";

document.addEventListener('DOMContentLoaded', () => {
const cassetteModel = new CassetteModel();
})

class CassetteModel{
    constructor(){
        this.container = document.querySelector('.modelViewer');

        // 必要な要素を宣言（カメラ、シーン、ローダー、レンダラー）
        this.camera = null;
        this.scene = null;
        this.loader = null;
        this.renderer = null;

        // モデルを格納する変数
        this.model = null;

        // モデルデータを配列に変換
        this.modelDataArray = Object.values(MODEL_DATA);
        this.modelGroup = new THREE.Group();

        // アニメーション関連の変数
        this.clock = new THREE.Clock();
        this.totalTime = 0;

        // マウスイベント関連の変数
        this.raycaster = new THREE.Raycaster(); // レイキャスターを作成
        this.pointer = new THREE.Vector2(); // マウス座標を保存する変数
        this.rect = this.container.getBoundingClientRect(); // 要素の位置を取得

        this.init();
    }

    init(){
        this.setupScene();
        this.setupRenderer();
        this.setupCamera();
        this.setupLights();
        this.setupEnviroment();
        this.setupModelGrpup();
        this.setupLoadModel();
        this.setupResizehandle();
        this.setUpMouseEvents();
        this.setupAnimation();
    }

    /*シーンの作成
    =============================*/
    setupScene(){
        this.scene = new THREE.Scene();
        this.scene.background = null;
    }

    /*レンダラーの作成
    =============================*/
    setupRenderer(){
        this.renderer = new THREE.WebGLRenderer({
            antialias: true, //アンチエイリアス
            alpha: true, //透過
            shadowMap: true //シャドウマップ
        });

        this.renderer.setSize( //レンダラーのサイズを指定
            this.container.clientWidth,
            this.container.clientHeight
        );

        this.container.appendChild(this.renderer.domElement); //取得要素の子要素として追加
    }

    /*リサイズ処理
    =============================*/
    setupResizehandle(){
        window.addEventListener('resize', () => {
            const width = this.container.clientWidth;
            const height = this.container.clientHeight;

            this.renderer.setSize(width, height); //レンダラーのサイズを変更
            this.camera.aspect = width / height; //カメラのサイズを変更

            this.camera.updateProjectionMatrix();
        })
    }

    /*カメラの作成
    =============================*/
    setupCamera(){
        this.camera = new THREE.PerspectiveCamera(
            15,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.rotation.set(0, Math.PI, 0);
        this.scene.add(this.camera);
    
        this.cameraCurrentPosition = {
            x: 0,
            y: 0,
            z: -5,
        };
    
        this.updateCameraPosition = () => {

            const offset = 6;
            const distance = Math.max(this.size.x, this.size.y) * offset;
    
            this.camera.position.set(
                this.center.x,
                this.center.y + 15,
                this.center.z + distance
            );
    
            this.camera.lookAt(this.center);
    
            // 更新された位置を記録
            this.cameraCurrentPosition = {
                x: this.camera.position.x,
                y: this.camera.position.y,
                z: this.camera.position.z
            };
        }
    }

    /*環境テクスチャのロード
    =============================*/
    setupEnviroment(){
        const exrLoader = new EXRLoader();
        exrLoader.load('./exr/sky-image.exr', (texture) => {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                this.scene.environment = texture;
                this.scene.background = null;
            },
            undefined,(error) => {console.error('環境テクスチャの読み込みエラー:',error);}
        );
    }

    /*モデルグループの作成
    =============================*/
    setupModelGrpup(){
        this.scene.add(this.modelGroup);
        this.modelGroup.rotation.y = THREE.MathUtils.degToRad(-45); //モデルグループのY軸を回転
        this.modelCenter = new THREE.Vector3(); //モデルの中心座標を取得
    }

    /*モデルのロード
    =============================*/
    async setupLoadModel(){
        this.loader = new GLTFLoader();
        this.models = [];

        let loadedCount = 0;
        const totalModels = this.modelDataArray.length;

        const loadPromises = this.modelDataArray.map((modelData, i )=> {
            return new Promise((resolve) => {
                this.loader.load(modelData.path, (gltf) => {
                    const model = gltf.scene;

                    // マテリアルの設定
                    model.traverse((child) => {
                        if(child.isMesh){
                            const material = child.material; //マテリアルを取得
                            //マテリアルがテクスチャを持っている場合
                            if(material.map){
                                material.transparent = true; //透過を有効にする
                                material.alphaTest = 0.1; //アルファテストを設定
                                material.side = THREE.DoubleSide; //両面描画を有効にする
                                material.depthWrite = true; //デプスバッファを有効にする
                                material.needsUpdate = true; //マテリアルを更新
                            }
                        }
                    });

                    model.position.set(0, 0, i * -0.5); //モデルの位置を設定
                    model.receiveShadow = true; //影を受け取る
                    model.castShadow = true; //影を投影する
                    
                    this.models.push(model); //モデルを配列に格納
                    this.modelGroup.add(model); //モデルをグループに追加

                    model.userData = {
                        id: modelData.id,
                        isClicked: false,
                        isLoaded: false,
                        isHovered: false,
                        title: modelData.title,
                        description: modelData.description,

                        currentPos: { //現在の座標を取得
                            x: model.position.x,
                            y: model.position.y,
                            z: model.position.z
                        },
                        
                        currentRot: { //現在の回転を取得
                            x: model.rotation.x,
                            y: model.rotation.y,
                            z: model.rotation.z
                        }
                    };

                    resolve(model); //モデルを返す
                    loadedCount++; //ロードカウントを増やす
                });
            });
        });

        await Promise.all(loadPromises); //全てのモデルがロードされるまで待機

        this.models.forEach((model) => {model.userData.isLoaded = true;}); //全てのモデルがロードされたらフラグを立てる
        this.setupModelBounds(); //モデルのバウンディングボックスを設定
        this.updateCameraPosition(); //カメラの位置を更新
        this.setupOpeningAnimation(); //オープニングアニメーションを設定
    }

    /*モデルのバウンディングボックスを設定
    =============================*/
    setupModelBounds(){
        this.box = new THREE.Box3().setFromObject(this.modelGroup); //モデルグループのバウンディングボックスを取得
        this.center = this.box.getCenter(new THREE.Vector3()); //バウンディングボックスの中心座標を取得
        this.size = this.box.getSize(new THREE.Vector3()); //バウンディングボックスのサイズを取得
    }

    /*ライトの作成
    =============================*/
    setupLights() {
        // 環境光
        const ambientLight = new THREE.AmbientLight(0xffffff, 5);
        this.scene.add(ambientLight);

        // 方向光源
        const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
        directionalLight.position.set(0, 0, 5);
        this.scene.add(directionalLight);
        
        // 追加光源（Y軸回転に合わせて配置）
        const sideLight = new THREE.DirectionalLight(0xffffff, 1.5);
        sideLight.position.set(5, 0, 0);
        this.scene.add(sideLight);
    }

    /*アニメーションの設定
    =============================*/
    setupAnimation() {
        const renderLoop = () => {
            const delta = this.clock.getDelta();
            this.totalTime += delta;
            this.renderer.render(this.scene, this.camera);
            requestAnimationFrame(renderLoop);
        }
        renderLoop();
    }

    setupOpeningAnimation() {
        const tl = gsap.timeline();
        tl.from(this.camera.position, {
            duration: 1.5,
            y: 10,
            ease: "power3.inOut",
        });
    }

    /*浮遊アニメーションの設定
    =============================*/
    setupFloatingAnimation() {
        
        // 各モデルに一度だけアニメーションを設定
        this.models.forEach((model, i) => {
            if (model.userData.isLoaded) {
                // 初期位置を保存（基準点）
                const baseY = model.position.y;
                
                const tl = gsap.timeline({ repeat: -1, yoyo: true });
                tl.to(model.position, {
                    y: baseY + 0.3, 
                    duration: 1.5,
                    delay: i * 0.1, // モデルごとに遅延
                    ease: "power3.inOut",
                });

                // モデルにアニメーションを保存
                model.userData.timeline = tl;

            }
        });
    }

    /*マウスイベントの設定
    =============================*/
    setUpMouseEvents(){

        // クリックされたときのイベント
        this.container.addEventListener('click', (e) => {

            this.pointer.x = ((e.clientX - this.rect.left) / this.rect.width) * 2 - 1;
            this.pointer.y = -((e.clientY - this.rect.top) / this.rect.height) * 2 + 1;
            this.raycaster.setFromCamera(this.pointer, this.camera);
            const intersects = this.raycaster.intersectObjects(this.modelGroup.children, true);

            if (intersects.length > 0) {
                const clickedObject = intersects[0].object;
                const clickedModel = this.findParentModel(clickedObject);
                
                // if (clickedModel && clickedModel.userData) { console.log("クリックされたモデル情報:", { id: clickedModel.userData.id, title: clickedModel.userData.title, description: clickedModel.userData.description, isHovered: clickedModel.userData.isHovered, isLoaded: clickedModel.userData.isLoaded }); } else { console.log("モデル情報が見つかりませんでした", clickedObject); }

                if (clickedModel.userData.isClicked){
                    clickedModel.userData.isClicked = false;
                    gsap.to(clickedModel.position, {
                        y: clickedModel.userData.currentPos.y,
                        duration: 0.1,
                    });
                } else {
                    clickedModel.userData.isClicked = true;
                    gsap.to(clickedModel.position, {
                        y: clickedModel.userData.currentPos.y + 0.1,
                        duration: 0.1,
                    });
                }
            }
        });

        // マウスオーバー時のイベント
        this.container.addEventListener('mousemove', (e) => {
            this.pointer.x = ((e.clientX - this.rect.left) / this.rect.width) * 2 - 1;
            this.pointer.y = -((e.clientY - this.rect.top) / this.rect.height) * 2 + 1;
            this.raycaster.setFromCamera(this.pointer, this.camera);
            const intersects = this.raycaster.intersectObjects(this.modelGroup.children, true);

            if (intersects.length > 0) {
                const hoveredObject = intersects[0].object;
                const hoveredModel = this.findParentModel(hoveredObject);

                if (hoveredModel && hoveredModel.userData) {
                    if (!hoveredModel.userData.isHovered) {
                        hoveredModel.userData.isHovered = true;
                        
                        gsap.to(hoveredModel.position, {
                            y: hoveredModel.userData.currentPos.y + 1,
                            duration: 0.1,
                        });
                    }
                }
            } else {
                this.models.forEach((model) => {
                    if (model.userData.isHovered) {
                        model.userData.isHovered = false;
                        gsap.to(model.position, {
                            y: model.userData.currentPos.y,
                            duration: 0.1,
                        });
                    }
                });
            }
        });
    }

    /*クリックされたオブジェクトの親モデルを特定するヘルパー関数
    =============================*/
    findParentModel(object) {
        // 自分自身がmodels配列に含まれるか確認
        if (this.models.includes(object)) {
            return object;
        }
        
        // 親をたどってモデルを探す
        let current = object;
        while (current && current.parent) {
            current = current.parent;
            if (this.models.includes(current)) {
                return current;
            }
        }
        
        return null; // 見つからなかった場合
    }
}