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
        this.camera.rotation.set(0, 0, 0);
        this.scene.add(this.camera);
    
        this.cameraCurrentPosition = {
            x: 0,
            y: 0,
            z: 0,
        };
    
        this.updateCameraPosition = () => {

            const offset = 6;
            const distance = Math.max(this.size.x, this.size.y) * offset;
    
            this.camera.position.set(
                this.center.x,
                this.center.y,
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

    /*モデルグループの作成
    =============================*/
    setupModelGrpup(){
        this.scene.add(this.modelGroup);
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

                    model.position.set(0, i * 0.5, i * -0.5); //モデルの位置を設定
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

                    loadedCount++; //ロードカウントを増やす
                    resolve(model); //モデルを返す
                });
            });
        });

        await Promise.all(loadPromises); //全てのモデルがロードされるまで待機

        this.models.forEach((model) => {model.userData.isLoaded = true;}); //全てのモデルがロードされたらフラグを立てる
        this.setupModelBounds(); //モデルのバウンディングボックスを設定
        this.updateCameraPosition(); //カメラの位置を更新

        await new Promise((resolve) => {
            setTimeout(resolve, 1000);
        });

        this.setupOpeningAnimation(); //オープニングアニメーションを設定
    }

    /*モデルのバウンディングボックスを設定
    =============================*/
    setupModelBounds(){
        this.box = new THREE.Box3().setFromObject(this.modelGroup); //モデルグループのバウンディングボックスを取得
        this.center = this.box.getCenter(new THREE.Vector3()); //バウンディングボックスの中心座標を取得
        this.size = this.box.getSize(new THREE.Vector3()); //バウンディングボックスのサイズを取得
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

    /*オープニングアニメーションの設定
    =============================*/
    setupOpeningAnimation() {
        const tl = gsap.timeline();
    }

    /*マウスイベントの設定
    =============================*/
    setUpMouseEvents() {
        // レイキャスターを作成
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // 現在ホバーしているモデル
        this.hoveredModel = null;

        this.container.addEventListener('mousemove', (e) => {
            this.animateHoverModel(e);
        })
        // マウスクリックイベント
        this.container.addEventListener('click', (e) => {
            this.animateModal(e);
        });
    }

    /*マウスホ  バーアニメーションの設定
    =============================*/
    animateHoverModel(e){
        this.mouse.x = ((e.clientX - this.rect.left) / this.container.clientWidth) * 2 - 1;
        this.mouse.y = -((e.clientY - this.rect.top) / this.container.clientHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.models, true);

        if (intersects.length > 0) {
            const hoveredModel = this.findParentModel(intersects[0].object);

            gsap.to(hoveredModel.position,{
                y: hoveredModel.userData.currentPos.y + 0.2,
                duration: 0.5,
                ease: "power2.out",
                onComplete: () => {
                    hoveredModel.userData.isHovered = true;
                }
            })
        }
    }


    /*モーダルアニメーションの設定
    =============================*/
    animateModal(e) {
        // マウス座標を正規化（-1から1の範囲に変換）
        const rect = this.container.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / this.container.clientWidth) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / this.container.clientHeight) * 2 + 1;
        
        // レイキャスト更新
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // 交差判定
        const intersects = this.raycaster.intersectObjects(this.models, true);
            
        if (intersects.length > 0) {
            const modal = document.querySelector('.modal__wrapper');
            const clickedModel = this.findParentModel(intersects[0].object);

            clickedModel.userData.isClicked = true; //クリックされたモデルのフラグを立てる
            clickedModel.userData.isHovered = false; //ホバーのフラグを下げる

            modal.style.display = 'block';
            modal.style.opacity = 0;

            const tl = gsap.timeline();
            tl
            .to(modal, {
                opacity: 1,
                duration: 2,
                ease: "power2.out"
            },)
            .from(".modal", {
                opacity: 0,
                scale: 1.2,
                filter: "blur(10px)",
            },"<")
            .to(".modal", {
                scale: 1,
                filter: "blur(0px)",
                opacity: 1,
                duration: 1,
                ease: "power2.out"
            });
            
            modal.querySelector('.modal__title').textContent = clickedModel.userData.title;
            modal.querySelector('.modal__description').textContent = clickedModel.userData.description;
        }
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